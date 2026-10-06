import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  UploadCloud, 
  Image as ImageIcon, 
  Trash2, 
  CheckCircle2, 
  Sparkles, 
  User, 
  AtSign, 
  Mail, 
  MapPin, 
  Building2, 
  Globe, 
  Github, 
  Linkedin, 
  Twitter, 
  Code2 
} from 'lucide-react';
import { UserProfile } from '@/types';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
  onSave: (updated: UserProfile) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  profile,
  onSave,
}) => {
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username);
  const [email, setEmail] = useState(profile.email);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [bio, setBio] = useState(profile.bio);
  const [location, setLocation] = useState(profile.location);
  const [institution, setInstitution] = useState(profile.institution);
  const [website, setWebsite] = useState(profile.website);
  const [github, setGithub] = useState(profile.github);
  const [linkedin, setLinkedin] = useState(profile.linkedin);
  const [twitter, setTwitter] = useState(profile.twitter);
  const [skillsStr, setSkillsStr] = useState(profile.skills.join(', '));

  const [isDragging, setIsDragging] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state whenever opened or profile changes
  useEffect(() => {
    if (isOpen) {
      setName(profile.name);
      setUsername(profile.username);
      setEmail(profile.email);
      setAvatarUrl(profile.avatarUrl || '');
      setBio(profile.bio);
      setLocation(profile.location);
      setInstitution(profile.institution);
      setWebsite(profile.website);
      setGithub(profile.github);
      setLinkedin(profile.linkedin);
      setTwitter(profile.twitter);
      setSkillsStr(profile.skills.join(', '));
      setShowSuccessPopup(false);
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  // Process file upload
  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, JPEG, WEBP).');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      if (typeof e.target?.result === 'string') {
        setAvatarUrl(e.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileProcess(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const updatedProfile: UserProfile = {
      ...profile,
      name: name.trim() || profile.name,
      username: username.trim() || profile.username,
      email: email.trim() || profile.email,
      avatarUrl: avatarUrl.trim(),
      bio: bio.trim(),
      location: location.trim(),
      institution: institution.trim(),
      website: website.trim(),
      github: github.trim(),
      linkedin: linkedin.trim(),
      twitter: twitter.trim(),
      skills: skillsStr
        .split(',')
        .map(s => s.trim().toLowerCase())
        .filter(Boolean),
    };

    onSave(updatedProfile);

    // Show the green tick notification popup
    setShowSuccessPopup(true);
    setTimeout(() => {
      setShowSuccessPopup(false);
      onClose();
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      {/* Main Edit Modal */}
      <div 
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-profile-title"
      >
        {/* Modal Header matching Ap Popup Design System */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#FAFAFC]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 text-[#E11D26] flex items-center justify-center font-bold shadow-2xs">
              <Sparkles className="w-5 h-5 text-[#E11D26]" />
            </div>
            <div>
              <h3 id="edit-profile-title" className="text-base font-bold text-gray-900">
                Edit Profile & Settings
              </h3>
              <p className="text-xs text-gray-500">
                Update your coding portfolio, photo, and identity settings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* 1. Drag & Drop Photo Upload Section */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Profile Photo (Drag & Drop or Click)
            </label>
            
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-5 flex items-center gap-5 transition-all cursor-pointer ${
                isDragging
                  ? 'border-[#E11D26] bg-red-50/50 scale-[1.01]'
                  : 'border-gray-300 hover:border-gray-400 bg-gray-50/60 hover:bg-gray-50'
              }`}
            >
              {/* Avatar Preview */}
              <div className="relative w-20 h-20 rounded-2xl overflow-hidden bg-gray-200 border-2 border-white shadow-md shrink-0 flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#E11D26] text-white font-extrabold text-xl flex items-center justify-center">
                    {name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AP'}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                  Change
                </div>
              </div>

              {/* Upload Prompts */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-800">
                  <UploadCloud className="w-4 h-4 text-[#E11D26]" />
                  <span>Drag & drop photo here, or browse</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Supports PNG, JPG, WEBP (stored in local database & profile)
                </p>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAvatarUrl('');
                    }}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 font-semibold transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Remove Photo</span>
                  </button>
                )}
              </div>

              {/* Hidden File Input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleFileInputChange}
              />
            </div>
          </div>

          {/* 2. Personal Identity Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-gray-400" />
                <span>Full Name</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#E11D26] focus:ring-2 focus:ring-red-100 transition-all font-medium"
                placeholder="Arun Pandian"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5 text-gray-400" />
                <span>Username / Handle</span>
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#E11D26] focus:ring-2 focus:ring-red-100 transition-all font-medium font-mono"
                placeholder="arun4709s"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <span>Email Address</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#E11D26] focus:ring-2 focus:ring-red-100 transition-all font-medium"
                placeholder="arunpandi47777@gmail.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400" />
                <span>Location</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#E11D26] focus:ring-2 focus:ring-red-100 transition-all font-medium"
                placeholder="India"
              />
            </div>
          </div>

          {/* 3. Bio & Organization */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-gray-400" />
                <span>Bio & Headline</span>
              </label>
              <input
                type="text"
                value={bio}
                onChange={e => setBio(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#E11D26] focus:ring-2 focus:ring-red-100 transition-all font-medium"
                placeholder="Insanely mad about coding"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-gray-400" />
                <span>Institution / University / Company</span>
              </label>
              <input
                type="text"
                value={institution}
                onChange={e => setInstitution(e.target.value)}
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#E11D26] focus:ring-2 focus:ring-red-100 transition-all font-medium"
                placeholder="National Institute of Technology Surathkal"
              />
            </div>
          </div>

          {/* 4. Social Links */}
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
              Social Portfolio Links
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-blue-500" />
                  <span>Website / Portfolio</span>
                </label>
                <input
                  type="text"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#E11D26] focus:ring-1 focus:ring-red-100 font-mono"
                  placeholder="https://arunpandian.dev"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                  <Github className="w-3 h-3 text-gray-700" />
                  <span>GitHub Handle</span>
                </label>
                <input
                  type="text"
                  value={github}
                  onChange={e => setGithub(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#E11D26] focus:ring-1 focus:ring-red-100 font-mono"
                  placeholder="arun4709s"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                  <Linkedin className="w-3 h-3 text-blue-600" />
                  <span>LinkedIn Handle</span>
                </label>
                <input
                  type="text"
                  value={linkedin}
                  onChange={e => setLinkedin(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#E11D26] focus:ring-1 focus:ring-red-100 font-mono"
                  placeholder="arun-pandian"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1 flex items-center gap-1.5">
                  <Twitter className="w-3 h-3 text-sky-500" />
                  <span>X / Twitter Handle</span>
                </label>
                <input
                  type="text"
                  value={twitter}
                  onChange={e => setTwitter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-gray-200 bg-white focus:outline-none focus:border-[#E11D26] focus:ring-1 focus:ring-red-100 font-mono"
                  placeholder="arunpandian"
                />
              </div>
            </div>
          </div>

          {/* 5. Technical Skills */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-gray-400" />
              <span>Technical Skills (comma-separated tags)</span>
            </label>
            <input
              type="text"
              value={skillsStr}
              onChange={e => setSkillsStr(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:outline-none focus:border-[#E11D26] focus:ring-2 focus:ring-red-100 transition-all font-medium font-mono"
              placeholder="c++, python, sql, rust, go, mern, flutter"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-[#E11D26] hover:bg-[#C8101A] active:scale-95 rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Save & Update Profile</span>
            </button>
          </div>
        </form>
      </div>

      {/* Emerald Green Tick Update Confirmation Popup (Matching Design System) */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl p-6 shadow-2xl border border-gray-100 max-w-sm w-full mx-4 text-center animate-in zoom-in-95 duration-150">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 mx-auto flex items-center justify-center mb-3 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 stroke-[2.5]" />
            </div>
            <h4 className="text-base font-bold text-gray-900">Profile Updated Successfully</h4>
            <p className="text-xs text-gray-500 mt-1">
              Your profile changes, photo, and settings have been saved!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
