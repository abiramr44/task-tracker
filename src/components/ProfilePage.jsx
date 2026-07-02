function ProfilePage({ user, onLogout, onChangePassword }) {
  return (
    <div className="profile-page">
      <div className="profile-card">
        <div className="profile-header">
          <div>
            <p className="profile-label">Name</p>
            <p className="profile-value">{user?.name || 'Unknown'}</p>
          </div>
          <div>
            <p className="profile-label">Email</p>
            <p className="profile-value">{user?.email || 'unknown@example.com'}</p>
          </div>
        </div>
        <button type="button" className="profile-button" onClick={onChangePassword}>
          Change password
        </button>
        <button type="button" className="profile-secondary" onClick={onLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}

export default ProfilePage;
