import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./styles/FormsHub.css";
import {
  User,
  Mail,
  Phone,
  Briefcase,
  Save,
  X,
  KeyRound,
  Image,
} from "lucide-react";
import { API_BASE_URL } from "./config/api.js";

function FormsList({ onLogout }) {
  const [selectedForm, setSelectedForm] = useState("");
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [message, setMessage] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const storedId = sessionStorage.getItem("id");

  const [formData, setFormData] = useState({
    id: "",
    employee_id: "",
    name: "",
    email: "",
    contact_no: "",
    role: "",
    signature: "",
    signature_preview: "",
    profile_img: "",
    profile_img_preview: "",
  });

  const [password, setPassword] = useState("");

  const forms = [
    "Purchase Request",
    "Revolving Fund",
    "Cash Advance Budget Request Form",
    "Cash Advance Liquidation Form",
    "CA Receipt Form",
    "Reimbursement Form",
    "Payment Request Form",
    "Maintenance or Repair",
    "HR Overtime Approval",
    "HR Leave Application",
    "Interbranch Transfer Slip",
    "Credit Card Acknowledgement Receipt",
  ];

  useEffect(() => {
    if (!storedId) return;
    fetch(`${API_BASE_URL}/users/${storedId}`)
      .then((res) => res.json())
      .then((data) => setFormData(data))
      .catch((err) => console.error("Error fetching user:", err));
  }, [storedId]);

  const isUserInfoIncomplete = () => {
    const { name, email, contact_no, signature, profile_img } = formData;
    return !name || !email || !contact_no || !signature || !profile_img;
  };

  const handleSettings = () => setShowSettingsModal(true);
  const handleCloseModal = () => {
    if (formData.profile_img_preview) {
      URL.revokeObjectURL(formData.profile_img_preview);
    }
    setIsClosing(true);
    setTimeout(() => {
      setShowSettingsModal(false);
      setIsClosing(false);
    }, 300);
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    if ((name === "signature" || name === "profile_img") && files && files[0]) {
      const file = files[0];
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        [name]: file,
        [`${name}_preview`]: previewUrl,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const formDataToSend = new FormData();
      formDataToSend.append("employee_id", formData.employee_id || "");
      formDataToSend.append("name", formData.name || "");
      formDataToSend.append("email", formData.email || "");
      formDataToSend.append("contact_no", formData.contact_no || "");
      formDataToSend.append("role", formData.role || "");

      if (password.trim() !== "") {
        formDataToSend.append("password", password);
      }
      if (formData.signature instanceof File) {
        formDataToSend.append("signature", formData.signature);
      }
      if (formData.profile_img instanceof File) {
        formDataToSend.append("profile_img", formData.profile_img);
      }

      const response = await fetch(`${API_BASE_URL}/users/update/${storedId}`, {
        method: "PUT",
        body: formDataToSend,
      });

      const result = await response.json();

      if (response.ok || result.success) {
        setMessage({ type: "success", text: "User updated successfully!" });
        setTimeout(() => {
          setMessage(null);
          handleCloseModal();
          window.location.reload();
        }, 2000);
      } else {
        setMessage({
          type: "error",
          text: result.message || "Failed to update user.",
        });
        setTimeout(() => setMessage(null), 3000);
      }
    } catch (error) {
      console.error(error);
      setMessage({ type: "error", text: "Error updating user." });
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGo = () => {
    if (isUserInfoIncomplete()) {
      setMessage({
        type: "error",
        text: "Please complete your profile details before proceeding.",
      });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    if (!selectedForm) {
      setMessage({
        type: "error",
        text: "Please select a form first.",
      });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const route = selectedForm
      .toLowerCase()
      .replace(/[\s/]+/g, "-")
      .replace(/[^\w-]/g, "");

    navigate(`/forms/${route}`);
  };

  return (
    <div className="forms-hub">
      <div className="forms-card">
        <header className="forms-header">
          <div className="forms-header-bar">
            <h1 className="forms-title">Forms Library</h1>
            <button
              type="button"
              className={`settings-button ${
                isUserInfoIncomplete() ? "settings-incomplete" : ""
              }`}
              title="Update Info"
              onClick={handleSettings}
            >
              <img
                src={
                  formData.profile_img_preview
                    ? formData.profile_img_preview
                    : formData.profile_img
                    ? `${API_BASE_URL}/uploads/profile/${formData.profile_img}`
                    : "/default.png"
                }
                alt="User Profile"
                className="settings-avatar"
              />
            </button>
          </div>

          <p className="forms-subtitle">
            Pick a standardized form to start a new request.
          </p>
        </header>

        <div className="forms-field">
          <label htmlFor="formSelect" className="forms-label">
            Select a form
          </label>
          <select
            id="formSelect"
            value={selectedForm}
            onChange={(event) => setSelectedForm(event.target.value)}
            className="forms-select"
          >
            <option value="" disabled>
              -- Choose a form --
            </option>
            {forms
            .filter(
              (form) =>
                !(
                  formData.role === "user" &&
                  (form === "Reimbursement Form" || form === "Cash Advance Liquidation Form" || form === "CA Receipt Form")
                )
            )
            .map((form) => (
              <option key={form} value={form}>
                {form}
              </option>
            ))}
          </select>
        </div>

        <div className="forms-actions">
          <button
            type="button"
            className="forms-button forms-button--primary"
            onClick={handleGo}
          >
            Open Form
          </button>
          {formData.role !== "user" && (
            <button
              type="button"
              className="forms-button forms-button--muted"
              onClick={() => navigate("/dashboard")}
            >
              Dashboard
            </button>
          )}
          {formData.role === "user" && (
            <button
              type="button"
              className="forms-button forms-button--muted"
              onClick={onLogout}
            >
              Sign Out
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className="message-modal-overlay">
          <div className={`message-modal-content ${message.type}`}>
            {message.text}
          </div>
        </div>
      )}

      {showSettingsModal && (
        <div className={`modal-overlay ${isClosing ? "fade-out" : ""}`}>
          <div className="modal-content user-modal">
            <div className="user-modal-header">
              <div className="user-avatar-container">
                <img
                  src={
                    formData.profile_img_preview
                      ? formData.profile_img_preview
                      : formData.profile_img
                      ? `${API_BASE_URL}/uploads/profile/${formData.profile_img}`
                      : "/default.png"
                  }
                  alt="Profile"
                  className="user-avatar"
                  onClick={() =>
                    document.getElementById("profileUpload").click()
                  }
                />
                <input
                  id="profileUpload"
                  type="file"
                  accept="image/*"
                  name="profile_img"
                  style={{ display: "none" }}
                  onChange={handleChange}
                />
              </div>
              <div className="user-info-text">
                <h3>{formData.name || "User Name"}</h3>
                <p>{formData.email || "user@email.com"}</p>
              </div>
            </div>

            <div className="user-modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>
                    <User size={16} /> Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name || ""}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>
                    <Mail size={16} /> Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ""}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>
                    <Phone size={16} /> Contact No.
                  </label>
                  <input
                    type="text"
                    name="contact_no"
                    value={formData.contact_no || ""}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group">
                  <label>
                    <Briefcase size={16} /> Role
                  </label>
                  <input
                    type="text"
                    value={(formData.role || "").toUpperCase()}
                    readOnly
                  />
                </div>
              </div>

              <div className="form-group">
                <label>
                  <Image size={16} /> Signature
                </label>

                {(formData.signature_preview || formData.signature) && (
                  <img
                    src={
                      formData.signature_preview
                        ? formData.signature_preview
                        : `${API_BASE_URL}/uploads/signatures/${formData.signature}`
                    }
                    alt="Signature Preview"
                    className="signature-preview"
                  />
                )}

                <input
                  type="file"
                  name="signature"
                  accept="image/*"
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label>
                  <KeyRound size={16} /> Password
                </label>
                <input
                  type="password"
                  name="password"
                  placeholder="Enter new password (optional)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-buttons">
              <button
                onClick={handleSave}
                className="save-btn"
                disabled={isSaving}
              >
                <Save size={16} /> {isSaving ? "Saving..." : "Save"}
              </button>
              <button onClick={handleCloseModal} className="cancel-btn">
                <X size={16} /> Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FormsList;
