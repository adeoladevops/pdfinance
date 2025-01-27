// scripts.js

// General function to handle form submissions
async function handleFormSubmission(formId, url, data, responseElementId) {
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const result = await response.json();
        const responseElement = document.getElementById(responseElementId);

        if (response.ok) {
            if (responseElement) {
                responseElement.textContent = result.message || "Operation successful!";
            } else {
                alert(result.message || "Operation successful!");
            }
        } else {
            if (responseElement) {
                responseElement.textContent = `Error: ${result.error || "Operation failed."}`;
            } else {
                alert(`Error: ${result.error || "Operation failed."}`);
            }
        }
    } catch (error) {
        console.error(`Error occurred while processing form ${formId}:`, error);
        alert("An unexpected error occurred.");
    }
}

// Authentication check
async function authCheck() {
    try {
        const response = await fetch("/auth-status");
        if (!response.ok) {
            window.location.href = "/login.html"; // Redirect to login if not authenticated
        }
    } catch (error) {
        console.error("Authentication check failed:", error);
        window.location.href = "/login.html"; // Redirect on error
    }
}

// Call authCheck on protected pages
const protectedPages = ["/upload.html", "/retrieve.html", "/generate_token.html", "/create_subadmin.html"];
if (protectedPages.includes(window.location.pathname)) {
    authCheck();
}

// Logout functionality
document.getElementById("logoutButton")?.addEventListener("click", async () => {
    try {
        const response = await fetch("/logout", { method: "POST" });
        if (response.ok) {
            window.location.href = "/login.html";
        } else {
            alert("Logout failed. Please try again.");
        }
    } catch (error) {
        console.error("Logout failed:", error);
        alert("An unexpected error occurred during logout.");
    }
});

// Form-specific event listeners

// For Retrieve PDF
document.getElementById("retrievePdfForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    // Extract form data
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    try {
        // Send the request to the backend
        const response = await fetch("/retrieve", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        // Handle the server's response
        if (response.ok) {
            const blob = await response.blob(); // Convert the response to a blob
            const url = window.URL.createObjectURL(blob); // Create a URL for the blob
            const a = document.createElement("a"); // Create a temporary anchor element
            a.href = url;
            a.download = data.search_key + "_file.pdf"; // Set the downloaded file's name dynamically
            document.body.appendChild(a);
            a.click(); // Trigger the download
            a.remove(); // Clean up the DOM element
        } else {
            // Handle errors returned from the server
            const error = await response.json();
            alert(`Error: ${error.error}`);
        }
    } catch (err) {
        // Catch unexpected errors
        console.error("Error retrieving the PDF:", err);
        alert("An unexpected error occurred. Please try again.");
    }
});


// For Create Sublevel Admin
document.getElementById("createSubAdminForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const accessLevel = document.getElementById("access_level").value;

    try {
        const response = await fetch("/create-subadmin", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                username,
                password,
                access_level: accessLevel,
            }),
        });

        const result = await response.json();

        if (response.ok) {
            // Display success message
            document.getElementById("response").textContent = result.message;

            // Clear the form fields
            document.getElementById("createSubAdminForm").reset();
        } else {
            // Display error message
            document.getElementById("response").textContent = result.error || "An error occurred.";
        }
    } catch (error) {
        document.getElementById("response").textContent = "Failed to connect to the server.";
    }
});

// For Generate Token
document.getElementById("generateTokenForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());

    try {
        const response = await fetch("/generate-token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(data),
        });

        const result = await response.json();

        if (response.ok) {
            // Display the token
            document.getElementById("response").innerText = `Success! Your token is: ${result.token}`;
        } else {
            // Display error message
            document.getElementById("response").innerText = `Error: ${result.error}`;
        }
    } catch (error) {
        console.error("Error generating token:", error);
        document.getElementById("response").innerText = "An unexpected error occurred.";
    }
});

// For Upload PDF
document.getElementById("uploadForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const formData = new FormData(event.target);

    try {
        const response = await fetch("/upload", {
            method: "POST",
            body: formData,
        });

        const result = await response.json();
        const responseElement = document.getElementById("response");

        if (response.ok) {
            responseElement.textContent = result.message || "Upload successful!";
        } else {
            responseElement.textContent = `Error: ${result.error || "Upload failed."}`;
        }
    } catch (error) {
        console.error("Error occurred during upload:", error);
        alert("An unexpected error occurred.");
    }
});
