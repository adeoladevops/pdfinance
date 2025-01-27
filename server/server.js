const express = require("express");
const multer = require("multer");
const session = require("express-session");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const db = require("./database");

const app = express();
const PORT = 3000;

// Middleware for serving static files
app.use(express.static("public"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure session middleware
app.use(
    session({
        secret: "$2SrunSoft01!",
        resave: false,
        saveUninitialized: false,
    })
);

// Configure Multer for file uploads
const storage = multer.diskStorage({
    destination: "./uploads",
    filename: (req, file, cb) => {
        cb(null, `${uuidv4()}-${file.originalname}`);
    },
});
const upload = multer({ storage });

// Authentication Middleware
function isAuthenticated(req, res, next) {
    if (req.session && req.session.admin) {
        return next();
    }
    res.status(401).redirect("/login.html"); // Redirect to login if not authenticated
}

// Routes for protected HTML pages
app.get("/upload.html", isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, "../public/upload.html"));
});

app.get("/retrieve.html", isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, "../public/retrieve.html"));
});

app.get("/generate_token.html", isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, "../public/generate_token.html"));
});

app.get("/create_subadmin.html", isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, "../public/create_subadmin.html"));
});

// Auth Status Route
app.get("/auth-status", (req, res) => {
    if (req.session && req.session.admin) {
        return res.json({ authenticated: true });
    }
    res.status(401).json({ authenticated: false });
});

// Logout Route
app.post("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: "Logout failed" });
        }
        res.json({ message: "Logged out successfully" });
    });
});

// Login Route
app.post("/login", (req, res) => {
    const { username, password } = req.body;

    db.get(
        `SELECT * FROM admins WHERE username = ? AND password = ?`,
        [username, password],
        (err, admin) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!admin) return res.status(401).json({ error: "Invalid credentials" });

            req.session.admin = admin; // Save admin info in the session
            res.json({ message: "Login successful" });
        }
    );
});

// Middleware to validate tokens
const validateToken = (req, res, next) => {
    const { token } = req.body;

    db.get(
        `SELECT * FROM tokens WHERE token = ?`,
        [token],
        (err, tokenRecord) => {
            if (err) return res.status(500).json({ error: "Database error" });
            if (!tokenRecord) return res.status(401).json({ error: "Invalid token" });

            if (tokenRecord.usage_count >= tokenRecord.max_usage) {
                return res.status(403).json({ error: "Token has expired" });
            }

            // Token is valid, proceed to the next middleware
            req.tokenRecord = tokenRecord;
            next();
        }
    );
};

// Upload PDF
app.post("/upload", isAuthenticated, upload.single("pdf_file"), (req, res) => {
    const {
        voucher_id,
        request_number,
        customerledger_id,
        net_pay,
        payee_address,
        bank_name,
        account_number,
    } = req.body;

    const uploadedFile = req.file;

    if (!uploadedFile) {
        return res.status(400).json({ error: "PDF file is required" });
    }

    db.run(
        `INSERT INTO uploads (voucher_id, request_number, customerledger_id, net_pay, payee_address, bank_name, account_number, file_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            voucher_id,
            request_number,
            customerledger_id,
            net_pay,
            payee_address,
            bank_name,
            account_number,
            uploadedFile.filename,
        ],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ message: "PDF uploaded successfully", id: this.lastID });
        }
    );
});

// Retrieve PDF
// Endpoint for retrieving PDFs
// const path = require("path");
const fs = require("fs");

app.post("/retrieve", isAuthenticated, validateToken, (req, res) => {
    const { tokenRecord } = req;
    const { search_key, search_value } = req.body;

    // Query the database for the PDF record
    const query = `SELECT * FROM uploads WHERE ${search_key} = ?`;
    db.get(query, [search_value], (err, row) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Database error" });
        }

        if (!row) {
            return res.status(404).json({ error: "No matching record found" });
        }

        const filePath = path.join(__dirname, "../uploads", row.file_name); // file path in my project structure

        // Check if the file exists on the server
        fs.access(filePath, fs.constants.F_OK, (fsErr) => {
            if (fsErr) {
                console.error("File not found:", fsErr);
                return res.status(404).json({ error: "File not found on the server" });
            }

            // Update the token's usage count
            const updateQuery = `UPDATE tokens SET usage_count = usage_count + 1 WHERE id = ?`;
            db.run(updateQuery, [tokenRecord.id], (updateErr) => {
                if (updateErr) {
                    console.error("Failed to update token usage:", updateErr);
                    return res.status(500).json({ error: "Failed to update token usage" });
                }

                // Send the file as a downloadable response
                res.download(filePath, path.basename(filePath), (downloadErr) => {
                    if (downloadErr) {
                        console.error("Error sending file:", downloadErr);
                        return res.status(500).json({ error: "Error sending the file" });
                    }

                    console.log(`File successfully sent: ${filePath}`);
                });
            });
        });
    });
});

// Generate Token
app.post("/generate-token", isAuthenticated, (req, res) => {
    const { username, password } = req.body;

    db.get(
        `SELECT * FROM admins WHERE username = ? AND password = ?`,
        [username, password],
        (err, admin) => {
            if (err) return res.status(500).json({ error: err.message });
            if (!admin) return res.status(401).json({ error: "Invalid credentials" });

            const token = uuidv4();
            const maxUsage = 2;

            db.run(
                `INSERT INTO tokens (token, admin_id, usage_count, max_usage) VALUES (?, ?, 0, ?)`,
                [token, admin.id, maxUsage],
                (err) => {
                    if (err) return res.status(500).json({ error: "Failed to store token" });
                    res.json({ message: "Token generated", token });
                }
            );
        }
    );
});

// Create Sublevel Admin
// Create Sublevel Admin
app.post("/create-subadmin", isAuthenticated, (req, res) => {
    const { username, password, access_level } = req.body;

    // Check if the logged-in admin has sufficient clearance
    if (req.session.admin.access_level < 4) {
        return res.status(403).json({
            error: "Unauthorized: Insufficient access level to create sublevel admins.",
        });
    }

    db.run(
        `INSERT INTO admins (username, password, access_level) VALUES (?, ?, ?)`,
        [username, password, access_level],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                message: `${username} has been created successfully`,
                id: this.lastID,
            });
        }
    );
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
