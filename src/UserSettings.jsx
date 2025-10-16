import { useState, useEffect } from "react";
import "./styles/UserSettings.css";
import { User, Mail, Phone, Briefcase, IdCard, Edit3, Save, X } from "lucide-react";

function UserSettings() {
  const storedId = sessionStorage.getItem("id");

  const [formData, setFormData] = useState({
    employee_id: "",
    name: "",
    email: "",
    contact_no: "",
    role: "",
    password: "",
    confirmPassword: "",
    signature_url: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [originalData, setOriginalData] = useState({}); // store original values before editing

  useEffect(() => {
    const storedEmployeeId = sessionStorage.getItem("employee_id") || "";
    const storedName = sessionStorage.getItem("name") || "";
    const storedEmail = sessionStorage.getItem("email") || "";
    const storedContact = sessionStorage.getItem("contact_no") || "";
    const storedRole = sessionStorage.getItem("role") || "";
    const storedSignature = sessionStorage.getItem("signature_url") || "";

    const userData = {
      employee_id: storedEmployeeId,
      name: storedName,
      email: storedEmail,
      contact_no: storedContact,
      role: storedRole,
      password: "",
      confirmPassword: "",
      signature_url: storedSignature,
    };

    setFormData(userData);
    setOriginalData(userData);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

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
    reader.readAsDataURL(file);
  };

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
        sessionStorage.setItem("employee_id", data.employee_id);
        sessionStorage.setItem("name", data.name);
        sessionStorage.setItem("email", data.email);
        sessionStorage.setItem("contact_no", data.contact_no);
        sessionStorage.setItem("role", data.role);
        if (data.signature_url) sessionStorage.setItem("signature_url", data.signature_url);

        alert("Profile updated successfully!");
        setIsEditing(false);
        setOriginalData(formData);
      } else {
        alert(data.message || "Failed to update profile.");
      }
    } catch (err) {
      console.error(err);
      alert("Server error. Please try again.");
    }
  };

  const handleCancel = () => {
    // restore original data and exit edit mode
    setFormData(originalData);
    setIsEditing(false);
  };

  return (
    <div className="user-settings">
      <h2 className="settings-title">User Profile</h2>

      <div className="settings-card">
        <div className="user-info-grid">
          <div className="info-item">
            <span className="info-label"><IdCard size={18} /> Employee ID</span>
            {isEditing ? (
              <input
                type="text"
                name="employee_id"
                value={formData.employee_id}
                onChange={handleChange}
                className="info-input"
              />
            ) : (
              <p className="info-value">{formData.employee_id || "—"}</p>
            )}
          </div>

          <div className="info-item">
            <span className="info-label"><User size={18} /> Full Name</span>
            {isEditing ? (
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="info-input"
              />
            ) : (
              <p className="info-value">{formData.name || "—"}</p>
            )}
          </div>

          <div className="info-item">
            <span className="info-label"><Mail size={18} /> Email</span>
            {isEditing ? (
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="info-input"
              />
            ) : (
              <p className="info-value">{formData.email || "—"}</p>
            )}
          </div>

          <div className="info-item">
            <span className="info-label"><Phone size={18} /> Contact Number</span>
            {isEditing ? (
              <input
                type="text"
                name="contact_no"
                value={formData.contact_no}
                onChange={handleChange}
                className="info-input"
              />
            ) : (
              <p className="info-value">{formData.contact_no || "—"}</p>
            )}
          </div>

          <div className="info-item">
            <span className="info-label"><Briefcase size={18} /> Role</span>
            <p className="info-value">{formData.role || "—"}</p>
          </div>

          <div className="info-item signature-section">
            <span className="info-label">Signature</span>
            {isEditing ? (
              <>
                <input type="file" accept="image/*" onChange={handleFileChange} />
                {formData.signature_url && (
                  <img src={formData.signature_url} alt="Signature" className="signature-img" />
                )}
              </>
            ) : formData.signature_url ? (
              <img src={formData.signature_url} alt="Signature" className="signature-img" />
            ) : (
              <p className="no-signature">No signature uploaded</p>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div className="settings-actions">
          {isEditing ? (
            <form
                onSubmit={(e) => {
                e.preventDefault();
                handleSave();
                }}
            >
                {/* All editable inputs go here */}
                <div className="user-info-grid">
                {/* Example input */}
                <div className="info-item">
                    <span className="info-label">
                    <IdCard size={18} /> Employee ID
                    </span>
                    <input
                    type="text"
                    name="employee_id"
                    value={formData.employee_id}
                    onChange={handleChange}
                    className="info-input"
                    />
                </div>

                </div>

                <div className="settings-actions">
                <button type="submit" className="btn-save">
                    <Save size={18} /> Save Changes
                </button>
                <button
                    type="button"
                    className="btn-cancel"
                    onClick={handleCancel}
                >
                    <X size={18} /> Cancel
                </button>
                </div>
            </form>
            ) : (
            <div className="settings-actions">
                <button className="btn-edit" onClick={() => setIsEditing(true)}>
                <Edit3 size={18} /> Update Profile
                </button>
            </div>
            )}

        </div>
      </div>
    </div>
  );
}

export default UserSettings;
