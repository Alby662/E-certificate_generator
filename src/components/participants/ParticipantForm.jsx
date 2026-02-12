import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ParticipantForm({ initialData, onSubmit, onCancel, isLoading }) {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        organization: "",
        department: "",
        jobTitle: "",
        customData: ""
    });

    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                customData: initialData.customData ? JSON.stringify(JSON.parse(initialData.customData), null, 2) : ""
            });
        }
    }, [initialData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: undefined }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errors = {};

        // Basic validation
        if (!formData.name.trim()) {
            errors.name = "Name is required";
        }
        if (!formData.email.trim()) {
            errors.email = "Email is required";
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = "Invalid email format";
        }

        const payload = { ...formData };

        // Parse customData if present
        if (payload.customData) {
            try {
                payload.customData = JSON.parse(payload.customData);
            } catch (err) {
                console.error("JSON Parse Error:", err);
                errors.customData = "Invalid JSON format";
            }
        } else {
            payload.customData = null;
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        onSubmit(payload);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        className={formErrors.name ? "border-red-500" : ""}
                    />
                    {formErrors.name && <p className="text-xs text-red-500">{formErrors.name}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                        className={formErrors.email ? "border-red-500" : ""}
                    />
                    {formErrors.email && <p className="text-xs text-red-500">{formErrors.email}</p>}
                </div>
                <div className="space-y-2">
                    <Label htmlFor="organization">Organization</Label>
                    <Input
                        id="organization"
                        name="organization"
                        value={formData.organization || ""}
                        onChange={handleChange}
                        placeholder="Company Ltd."
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input
                        id="jobTitle"
                        name="jobTitle"
                        value={formData.jobTitle || ""}
                        onChange={handleChange}
                        placeholder="Software Engineer"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                        id="department"
                        name="department"
                        value={formData.department || ""}
                        onChange={handleChange}
                        placeholder="Engineering"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                        id="phone"
                        name="phone"
                        value={formData.phone || ""}
                        onChange={handleChange}
                        placeholder="+1 234 567 8900"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="customData">Custom Data (JSON) (Optional)</Label>
                <Textarea
                    id="customData"
                    name="customData"
                    value={formData.customData || ""}
                    onChange={handleChange}
                    placeholder='{"employeeId": "123", "tShirtSize": "L"}'
                    className={`font-mono text-sm h-24 ${formErrors.customData ? "border-red-500" : ""}`}
                />
                {formErrors.customData && <p className="text-xs text-red-500">{formErrors.customData}</p>}
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                    {isLoading ? "Saving..." : (initialData ? "Update Participant" : "Add Participant")}
                </Button>
            </div>
        </form>
    );
}
