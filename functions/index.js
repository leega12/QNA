const functions = require("firebase-functions");
const admin = require("firebase-admin");
const xlsx = require("xlsx");

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();
const BATCH_SIZE = 500; // Firestore batch limit

/**
 * Triggered by a file upload to the 'user-uploads/' path in Cloud Storage.
 * This function synchronizes Firebase Auth and Firestore users with an uploaded Excel file.
 */
exports.processUserExcel = functions
    .runWith({ timeoutSeconds: 540, memory: "1GB" })
    .storage.object().onFinalize(
        async (object) => {
        const fileBucket = object.bucket;
        const filePath = object.name;
        const contentType = object.contentType;

        // Exit if this is not an Excel file or not in the right folder.
        if (!contentType.includes("spreadsheetml") && !contentType.includes("excel")) {
            return functions.logger.log("This is not an Excel file.");
        }
        if (!filePath.startsWith("user-uploads/")) {
            return functions.logger.log("File is not in the 'user-uploads/' directory.");
        }

        const uploadId = filePath.split("/").pop();
        const jobRef = db.collection("uploadJobs").doc(uploadId);

        await jobRef.set({
            status: "processing",
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            summary: "Starting user synchronization process...",
        });

        try {
            // 1. Download and parse the Excel file
            const bucket = admin.storage().bucket(fileBucket);
            const fileBuffer = (await bucket.file(filePath).download())[0];
            const workbook = xlsx.read(fileBuffer, { type: "buffer" });

            const excelUsers = [];
            const excelUserEmails = new Set();
            
            await jobRef.update({ summary: "Parsing Excel file..." });

            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];
                const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (!row || row.length === 0) continue;

                    let user = { email: "", role: "student", info: {} };
                    
                    // Same parsing logic as before
                    if (sheetName === "교사용") {
                        user.info.name = row[0] ? String(row[0]).trim() : "";
                        user.email = row[1];
                        user.role = "teacher";
                    } else if (["1학년", "2학년", "3학년"].includes(sheetName)) {
                        user.info.grade = sheetName === "1학년" ? (parseInt(row[0]) || 1) : (sheetName === "2학년" ? 2 : 3);
                        user.info.classNum = sheetName === "1학년" ? (parseInt(row[1]) || 0) : (parseInt(row[0]) || 0);
                        user.info.number = sheetName === "1학년" ? (parseInt(row[2]) || 0) : (parseInt(row[1]) || 0);
                        user.info.name = sheetName === "1학년" ? (row[3] ? String(row[3]).trim() : "") : (row[2] ? String(row[2]).trim() : "");
                        user.email = sheetName === "1학년" ? row[4] : row[3];
                    } else {
                        continue;
                    }

                    if (!user.email) continue;
                    user.email = String(user.email).trim().toLowerCase();
                    if (!user.email) continue;

                    if (user.email.endsWith("@keisunghs")) user.email += ".kr";
                    if (!user.email.includes("@")) continue;

                    excelUsers.push(user);
                    excelUserEmails.add(user.email);
                }
            }

            // 2. Get all existing Auth users
            await jobRef.update({ summary: "Fetching existing users..." });
            const allAuthUsers = [];
            let nextPageToken;
            do {
                const listUsersResult = await auth.listUsers(1000, nextPageToken);
                allAuthUsers.push(...listUsersResult.users);
                nextPageToken = listUsersResult.pageToken;
            } while (nextPageToken);
            
            const existingUserEmails = new Set(allAuthUsers.map(u => u.email));

            // 3. Identify users to delete
            const authUsersToDelete = allAuthUsers.filter(user => {
                const claims = user.customClaims || {};
                const isManagedRole = claims.role === "student" || claims.role === "teacher";
                return isManagedRole && !excelUserEmails.has(user.email);
            });
            const uidsToDelete = authUsersToDelete.map(u => u.uid);

            let deletedCount = 0;
            if (uidsToDelete.length > 0) {
                await jobRef.update({ summary: `Deleting ${uidsToDelete.length} old users...` });

                for (let i = 0; i < uidsToDelete.length; i += BATCH_SIZE) {
                    const chunk = uidsToDelete.slice(i, i + BATCH_SIZE);
                    
                    // Delete from Auth in batches
                    const deleteResult = await auth.deleteUsers(chunk);
                    deletedCount += deleteResult.successCount;
                    
                    // Delete from Firestore in batches
                    const batch = db.batch();
                    chunk.forEach(uid => batch.delete(db.collection("users").doc(uid)));
                    await batch.commit();
                }
            }
            
            // 4. Prepare users for import (create or update)
            const usersToImport = excelUsers.map(user => ({
                email: user.email,
                password: "keisung1906", // Default password
                emailVerified: true,
            }));
            
            let createdCount = 0;
            let updatedCount = 0;

            await jobRef.update({ summary: `Importing ${excelUsers.length} users to Auth...` });

            // Using email as identifier will update existing users and create new ones.
            const importResult = await auth.importUsers(usersToImport, {
                hash: { algorithm: "STANDARD_SCRIPTS" },
            });
            
            // Separate new and existing users for counting
            for (const user of excelUsers) {
                if (existingUserEmails.has(user.email)) {
                    updatedCount++;
                } else {
                    createdCount++;
                }
            }

            // 5. Update Firestore and Custom Claims in batches
            await jobRef.update({ summary: "Updating user details in database..." });
            const AUTH_BATCH_SIZE = 100; // Batch size to avoid rate limits

            for (let i = 0; i < excelUsers.length; i += AUTH_BATCH_SIZE) {
                const chunk = excelUsers.slice(i, i + AUTH_BATCH_SIZE);
                const promises = [];
                
                await jobRef.update({ summary: `Updating details for users ${i + 1} to ${i + chunk.length}...` });

                for (const user of chunk) {
                    const processUser = async () => {
                        const userRecord = await auth.getUserByEmail(user.email);
                        const { uid } = userRecord;

                        // Set custom claims for role-based access control
                        await auth.setCustomUserClaims(uid, { role: user.role });
                        
                        // Set user data in Firestore
                        const userDocRef = db.collection("users").doc(uid);
                        await userDocRef.set({
                            email: user.email,
                            role: user.role,
                            ...user.info
                        }, { merge: true });
                    };
                    promises.push(processUser());
                }
                await Promise.all(promises);
            }
            
            // 6. Final Report
            const summary = `Sync complete. Created: ${createdCount}, Updated: ${updatedCount}, Deleted: ${deletedCount}. Errors: ${importResult.failureCount}.`;
            await jobRef.set({
                status: "success",
                summary: summary,
                finishedAt: admin.firestore.FieldValue.serverTimestamp(),
                errors: importResult.errors.map(err => `Index: ${err.index}, Error: ${err.error.message}`),
            });

        } catch (error) {
            functions.logger.error("Error processing user excel:", error);
            await jobRef.set({
                status: "error",
                summary: "An unexpected error occurred.",
                error: error.message,
                finishedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    });
