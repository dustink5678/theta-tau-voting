import React, { useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';

const UpdateProfile: React.FC = () => {
  const { currentUser, updateUserEmail, updateUserPassword } = useAuthContext();
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    const promises: Promise<void>[] = [];
    setLoading(true);
    setError('');
    setMessage('');

    if (email !== currentUser?.email) {
      promises.push(updateUserEmail(email));
    }
    if (password) {
      promises.push(updateUserPassword(password));
    }

    try {
      await Promise.all(promises);
      setMessage('Profile updated successfully');
    } catch (error: any) {
      setError('Failed to update account');
    }

    setLoading(false);
  };

  return (
    <div>
      <h2>Update Profile</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep the same"
          />
        </div>
        <div>
          <label>Password Confirmation</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Leave blank to keep the same"
          />
        </div>
        <button disabled={loading} type="submit">
          Update
        </button>
      </form>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      {message && <div style={{ color: 'green' }}>{message}</div>}
    </div>
  );
};

export default UpdateProfile; 