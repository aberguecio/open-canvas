import { useEffect, useState } from 'react';
import { fetchUsers, banUser, unbanUser, User } from '../services/ImageService';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (email: string) => {
    const reason = prompt('Reason for ban (optional):');
    if (reason === null) return; // User cancelled

    try {
      await banUser(email, reason || undefined);
      loadUsers();
    } catch (err) {
      console.error('Error banning user:', err);
      alert('Failed to ban user');
    }
  };

  const handleUnban = async (email: string) => {
    try {
      await unbanUser(email);
      loadUsers();
    } catch (err) {
      console.error('Error unbanning user:', err);
      alert('Failed to unban user');
    }
  };

  if (loading) return <div style={{ padding: '2rem' }}>Loading users...</div>;

  return (
    <div style={{ padding: '2rem' }}>
      <h1>User Management</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--color-border)' }}>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Name</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Email</th>
            <th style={{ padding: '1rem', textAlign: 'center' }}>Uploads</th>
            <th style={{ padding: '1rem', textAlign: 'center' }}>Flagged</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>Last Upload</th>
            <th style={{ padding: '1rem', textAlign: 'center' }}>Status</th>
            <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.email} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '1rem' }}>{user.name}</td>
              <td style={{ padding: '1rem' }}>{user.email}</td>
              <td style={{ padding: '1rem', textAlign: 'center' }}>{user.uploadCount}</td>
              <td style={{ padding: '1rem', textAlign: 'center' }}>
                {user.flaggedCount > 0 ? (
                  <span style={{ color: 'red', fontWeight: 'bold' }}>{user.flaggedCount}</span>
                ) : (
                  '0'
                )}
              </td>
              <td style={{ padding: '1rem' }}>
                {new Date(user.lastUpload).toLocaleDateString()}
              </td>
              <td style={{ padding: '1rem', textAlign: 'center' }}>
                {user.isBanned ? (
                  <span style={{ color: 'red', fontWeight: 'bold' }}>BANNED</span>
                ) : (
                  <span style={{ color: 'green' }}>Active</span>
                )}
              </td>
              <td style={{ padding: '1rem', textAlign: 'center' }}>
                {user.isBanned ? (
                  <button onClick={() => handleUnban(user.email)}>Unban</button>
                ) : (
                  <button onClick={() => handleBan(user.email)}>Ban</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
