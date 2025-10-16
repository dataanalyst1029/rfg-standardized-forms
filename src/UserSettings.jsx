import { useState, useEffect } from "react";
import "./styles/UserSettings.css";

function UserSettings() {
  const storedId = sessionStorage.getItem("id"); // user id from login

  const [formData, setFormData] = useState({
    employee_id: "",
    name: "",
    email: "",
    contact_no: "",
    role: "",
    password: "",
    confirmPassword: "",
    signature_url: "", // Base64 image
  });

  useEffect(() => {
    // Load existing data from sessionStorage
    const storedEmployeeId = sessionStorage.getItem("employee_id") || "";
    const storedName = sessionStorage.getItem("name") || "";
    const storedEmail = sessionStorage.getItem("email") || "";
    const storedContact = sessionStorage.getItem("contact_no") || "";
    const storedRole = sessionStorage.getItem("role") || "";
    const storedSignature = sessionStorage.getItem("signature_url") || "";

    setFormData((prev) => ({
      ...prev,
      employee_id: storedEmployeeId,
      name: storedName,
      email: storedEmail,
      contact_no: storedContact,
      role: storedRole,
      signature_url: storedSignature,
    }));
  }, []);

  // Handle input text change
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle image upload
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData((prev) => ({ ...prev, signature_url: reader.result }));
    };
    reader.readAsDataURL(file); // convert image to Base64
  };

  // Save changes
  const handleSave = async () => {
    if (formData.password && formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      const res = await fetch(`${process.env.REACT_APP_API_BASE_URL}/api/users/${storedId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        // Update sessionStorage
        sessionStorage.setItem("employee_id", data.employee_id);
        sessionStorage.setItem("name", data.name);
        sessionStorage.setItem("email", data.email);
        sessionStorage.setItem("contact_no", data.contact_no);
        sessionStorage.setItem("role", data.role);
        if (data.signature_url) sessionStorage.setItem("signature_url", data.signature_url);

        alert("Profile updated successfully!");
      } else {
        alert(data.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      alert("Server error. Please try again.");
    }
  };

  return (
    <div className="user-settings">
        <h2>User Profile & Settings</h2>

        <div className="settings-form">
            <label>
                Employee ID
                <input
                type="text"
                name="employee_id"
                value={formData.employee_id}
                onChange={handleChange}
                />
            </label>

            <label>
                Full Name
                <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                />
            </label>

            <label>
                Email
                <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                />
            </label>

            <label>
                Contact Number
                <input
                type="text"
                name="contact_no"
                value={formData.contact_no}
                onChange={handleChange}
                />
            </label>

            <label>
                Role
                <input
                type="text"
                name="role"
                value={formData.role}
                readOnly
                style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
                />
            </label>

            <label>
                Signature
                <input type="file" accept="image/*" onChange={handleFileChange} />
            </label>

            {formData.signature_url && (
                <div className="signature-preview">
                <img
                    src={formData.signature_url}
                    alt="Signature Preview"
                />
                </div>
            )}

            <label>
                New Password
                <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                />
            </label>

            <label>
                Confirm Password
                <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                />
            </label>

            <div className="form-actions">
                <button type="button" className="btn-save" onClick={handleSave}>
                Save Changes
                </button>
            </div>
        </div>
    </div>
  );
}

export default UserSettings;
