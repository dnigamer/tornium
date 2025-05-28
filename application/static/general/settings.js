/* Copyright (C) 2021-2025 tiksan

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>. */

const params = new Proxy(new URLSearchParams(window.location.search), {
    get: (searchParams, prop) => searchParams.get(prop),
});
const token = params.token;

$(document).ready(function () {
    // Theme selection
    const getTheme = function () {
        if (localStorage.getItem("theme")) {
            return localStorage.getItem("theme");
        }

        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "custom-dark" : "light";
    };

    $("#theme-selector").on("change", function (e) {
        localStorage.setItem("theme", this.value);
        document.documentElement.setAttribute("data-bs-theme", this.value);
    });

    $(`option[value="${getTheme()}"]`).prop("selected", true);

    // Security mode selector
    $("#disable-mfa").on("click", function () {
        if (token === null) {
            generateToast("Permission Denied", "Invalid token", "Error");
            return;
        }

        let xhttp = new XMLHttpRequest();
        xhttp.onload = function () {
            let response = xhttp.response;

            if ("code" in response) {
                generateToast("Security Mode Switch Failed", response["message"]);
                window.location.reload();
            } else {
                $("#disable-mfa").attr("disabled", true);
                $("#enable-totp").attr("disabled", false);
                window.location.reload();
            }
        };

        xhttp.responseType = "json";
        xhttp.open("POST", `/security?token=${token}`);
        xhttp.setRequestHeader("Content-Type", "application/json");
        xhttp.send(
            JSON.stringify({
                mode: 0,
            }),
        );
    });

    $("#enable-totp").on("click", function () {
        if (token === null) {
            generateToast("Permission Denied", "Invalid token", "Error");
            return;
        }

        let xhttp = new XMLHttpRequest();
        xhttp.onload = function () {
            let response = xhttp.response;

            if (response.details.mode === 0) {
                $("#disable-mfa").attr("disabled", true);
                $("#enable-totp").attr("disabled", false);
                showTOTPVerify();
            } else if (response.details.mode === 1) {
                $("#disable-mfa").attr("disabled", true);
                $("#enable-totp").attr("disabled", false);
                window.location.reload();
            }
        };

        xhttp.responseType = "json";
        xhttp.open("GET", `/security?token=${token}`);
        xhttp.setRequestHeader("Content-Type", "application/json");
        xhttp.send();
    });

    // TOTP QR code (no verification needed)
    // This function is used to show the TOTP QR code after the user has already set up TOTP.
    function showTOTP() {
        if (token === null) {
            generateToast("Permission Denied", "Invalid token", "Error");
            return;
        }

        let xhttp = new XMLHttpRequest();

        xhttp.onload = function () {
            let response = xhttp.response;

            if ("code" in response) {
                generateToast("QR Code Generation Failed", response["message"]);
                return;
            }

            $("#settings-modal-label").text("TOTP QR Code");
            $("#settings-modal-body").empty();

            // Instructions
            $("#settings-modal-body").append(
                $("<div>", {
                    class: "alert alert-info mb-3",
                    html: `
                    <strong>Set up Two-Factor Authentication (TOTP)</strong><br>
                    Scan the QR code below with your authenticator app (e.g., Google Authenticator, Duo Mobile).<br>
                    Alternatively, enter the secret key manually.
                    `
                })
            );

            // QR Code container
            const qrRow = $("<div>", { class: "d-flex justify-content-center mb-3" });
            const qrCol = $("<div>", { id: "qr-code-container", class: "p-3 border rounded bg-light" });
            qrRow.append(qrCol);
            $("#settings-modal-body").append(qrRow);

            // Generate QR code
            new QRCode(document.getElementById("qr-code-container"), {
                text: response["url"],
                width: 180,
                height: 180
            });

            // Secret key display
            $("#settings-modal-body").append(
                $("<div>", {
                    class: "mb-3 text-center",
                    html: `
                    <span class="fw-semibold">Manual Entry Code:</span>
                    <span class="badge bg-secondary ms-2" style="font-size:1.1em; letter-spacing:2px;">${response["secret"]}</span>
                    `
                })
            );

            let modal = new bootstrap.Modal($("#settings-modal"));
            modal.show();
        };

        xhttp.responseType = "json";
        xhttp.open("GET", `/totp/secret?token=${token}`);
        xhttp.setRequestHeader("Content-Type", "application/json");
        xhttp.send();
    }

    // TOTP QR code with verification
    // This function is used to show the TOTP QR code and allow the user to verify it.
    function showTOTPVerify() {
        if (token === null) {
            generateToast("Permission Denied", "Invalid token", "Error");
            return;
        }

        let xhttp = new XMLHttpRequest();

        xhttp.onload = function () {
            let response = xhttp.response;

            $("#settings-modal-label").text("TOTP QR Code");
            $("#settings-modal-body").empty();

            // Instructions
            $("#settings-modal-body").append(
            $("<div>", {
                class: "alert alert-info mb-3",
                html: `
                <strong>Set up Two-Factor Authentication (TOTP)</strong><br>
                Scan the QR code below with your authenticator app (e.g., Google Authenticator, Duo Mobile).<br>
                Alternatively, enter the secret key manually.
                `
            })
            );

            // QR Code container
            const qrRow = $("<div>", { class: "d-flex justify-content-center mb-3" });
            const qrCol = $("<div>", { id: "qr-code-container", class: "p-3 border rounded bg-light" });
            qrRow.append(qrCol);
            $("#settings-modal-body").append(qrRow);

            // Generate QR code
            new QRCode(document.getElementById("qr-code-container"), {
                text: response.details["url"],
                width: 180,
                height: 180
            });

            // Secret key display
            $("#settings-modal-body").append(
                $("<div>", {
                    class: "mb-3 text-center",
                    html: `
                    <span class="fw-semibold">Manual Entry Code:</span>
                    <span class="badge bg-secondary ms-2" style="font-size:1.1em; letter-spacing:2px;">${response.details["secret"]}</span>
                    `
                })
            );

            // Verify code input
            $("#settings-modal-body").append(
                $("<div>", {
                    class: "mb-3",
                    html: `
                    <label for="totp-code" class="form-label">Enter TOTP Code</label>
                    <input type="text" class="form-control text-center" id="totp-code" placeholder="123456" maxlength="6" style="font-size:1.25em; letter-spacing:4px;">
                    `
                })
            );
            $("#settings-modal-body").append(
                $("<div>", { class: "d-flex justify-content-end gap-2" }).append(
                    $("<button>", {
                        class: "btn btn-danger px-4",
                        id: "cancel-totp-verify",
                        type: "button",
                        text: "Cancel",
                        "data-bs-dismiss": "modal"
                    }),
                    $("<button>", {
                        class: "btn btn-success px-4",
                        id: "verify-totp-code",
                        type: "button",
                        text: "Verify"
                    })
                )
            );

            let modal = new bootstrap.Modal($("#settings-modal"));
            modal.show();
        };

        xhttp.responseType = "json";
        xhttp.open("POST", `/totp/secret?token=${token}`);
        xhttp.setRequestHeader("Content-Type", "application/json");
        xhttp.send();
    }

    $("#show-totp-qr").on("click", showTOTP);

    $(document).on("click", "#verify-totp-code", function () {
        if (token === null) {
            generateToast("Permission Denied", "Invalid token", "Error");
            return;
        }

        const code = $("#totp-code").val().trim();
        if (code.length !== 6 || isNaN(code)) {
            generateToast("Invalid TOTP Code", "Please enter a valid 6-digit TOTP code.", "Error");
            return;
        }

        let xhttp = new XMLHttpRequest();
        xhttp.onload = function () {
            let response = xhttp.response;
            
            if (response.code === 0) {
                generateToast("TOTP Verification Failed", response.details["message"], "Error");
                return;
            }

            generateToast("TOTP Verification Successful", "Your TOTP has been successfully set up.");
            $("#disable-mfa").attr("disabled", true);
            $("#enable-totp").attr("disabled", false);

            let modal = bootstrap.Modal.getInstance($("#settings-modal"));
            modal.hide();
            window.location.reload();
        };
        
        xhttp.responseType = "json";
        xhttp.open("POST", `/totp/verify?token=${token}`);
        xhttp.setRequestHeader("Content-Type", "application/json");
        xhttp.send(JSON.stringify({ totp_code: code }));
    });

    // TOTP Regenerate Secret
    $("#regen-totp-secret").on("click", function () {
        if (token === null) {
            generateToast("Permission Denied", "Invalid token", "Error");
            return;
        }
        showTOTPVerify();
    });

    // TOTP Regenerate Backup Codes
    $("#regen-totp-codes").on("click", function () {
        if (token === null) {
            generateToast("Permission Denied", "Invalid token", "Error");
            return;
        }

        let xhttp = new XMLHttpRequest();
        xhttp.onload = function () {
            let response = xhttp.response;

            if ("code" in response) {
                generateToast("Backup Generation Failed", response["message"]);
                return;
            }

            $("#settings-modal-label").text("TOTP Backup Codes");
            $("#settings-modal-body").empty();

            // Info alert
            $("#settings-modal-body").append(
                $("<div>", {
                    class: "alert alert-info mb-3",
                    html:
                        "<strong>Important:</strong> TOTP backup codes are for use if your primary authenticator is unavailable. " +
                        "These codes are shown only once. Save them securely. Each code can be used only once."
                })
            );

            // Codes list in a card
            const codesCard = $("<div>", { class: "card mb-3 shadow-sm" });
            codesCard.append(
                $("<div>", { class: "card-header fw-semibold", text: "Your Backup Codes" })
            );
            const codesList = $("<ul>", {
                class: "list-group list-group-flush text-center fs-5",
                id: "totp-backup-container"
            });
            $.each(response["codes"], function (index, code) {
                codesList.append(
                    $("<li>", {
                        class: "list-group-item py-2",
                        text: code
                    })
                );
            });
            codesCard.append(codesList);
            $("#settings-modal-body").append(codesCard);

            // Action buttons
            const btnGroup = $("<div>", { class: "d-flex justify-content-end gap-2" });
            btnGroup.append(
                $("<button>", {
                    class: "btn btn-outline-success",
                    id: "copy-totp-backup",
                    type: "button",
                    html: '<i class="bi bi-clipboard"></i> Copy'
                }),
                $("<button>", {
                    class: "btn btn-outline-primary",
                    id: "save-totp-backup",
                    type: "button",
                    html: '<i class="bi bi-download"></i> Save as File'
                })
            );
            $("#settings-modal-body").append(btnGroup);

            // Clipboard and file save functionality
            $("#copy-totp-backup").on("click", function () {
                navigator.clipboard.writeText(response["codes"].join("\n")).then(function () {
                    generateToast("Codes Copied", "The TOTP backup codes have been copied to your clipboard");
                });
            });

            $("#save-totp-backup").on("click", function () {
                const blob = new Blob([response["codes"].join("\n")], { type: "text/plain;charset=utf-8" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "tornium-totp-backup-codes.txt";
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                generateToast("Codes Saved", "The TOTP backup codes have been saved as a file.");
            });

            let modal = new bootstrap.Modal($("#settings-modal"));
            modal.show();
        };

        xhttp.responseType = "json";
        xhttp.open("POST", `/totp/backup?token=${token}`);
        xhttp.setRequestHeader("Content-Type", "application/json");
        xhttp.send();
    });

    function addNewKey() {
        tfetch("POST", "key", { body: { key: $("#api-key-input").val() }, errorTitle: "API Key Add Failed" }).then(
            () => {
                generateToast("API Key Input Successful", "The Tornium API server has successfully set your API key.");
                window.location.reload();
            },
        );
    }

    $("#api-key-input").on("keypress", e => e.which === 13 && addNewKey());
    $("#submit-new-key").on("click", addNewKey);

    $(".disable-key").on("click", function () {
        tfetch("PATCH", `key/${$(this).attr("data-key-guid")}`, {
            body: { disabled: true },
            errorTitle: "API Key Disable Failed",
        }).then(() => {
            window.location.reload();
        });
    });

    $(".enable-key").on("click", function () {
        tfetch("PATCH", `key/${$(this).attr("data-key-guid")}`, {
            body: { disabled: false },
            errorTitle: "API Key Enable Failed",
        }).then(() => {
            window.location.reload();
        });
    });

    $(".delete-key").on("click", function () {
        tfetch("DELETE", `key/${$(this).attr("data-key-guid")}`, { errorTitle: "API Key Delete Failed" }).then(() => {
            generateToast("API Key Delete Successful");
            $(this).closest(".key-parent").remove();
            //$button.closest(".row, .key-parent, .d-flex").remove(); - should be this
        });
    });
});
