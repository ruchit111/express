import { useEffect, useState } from 'react'
import './App.css'

const API_URL = '/api/users'

function App() {
  const [users, setUsers] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    email: '',
  })
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info') // 'info' | 'success' | 'error'
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [editingId, setEditingId] = useState(null)

  const showNotification = (msg, type = 'info') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => {
      setMessage((prev) => (prev === msg ? '' : prev))
    }, 5000)
  }

  const fetchUsers = async (clearMessage = true) => {
    setIsLoading(true)
    if (clearMessage) {
      setMessage('')
    }

    try {
      const response = await fetch(API_URL)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not fetch records')
      }

      setUsers(Array.isArray(data.users) ? data.users : [])
    } catch (err) {
      setUsers([])
      showNotification(
        'Could not connect to backend. Start the backend with npm start in the backend folder.',
        'error'
      )
      console.error('Fetch records error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers()
    }, 0)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setIsSubmitting(true)
    setMessage('')

    try {
      const payload = {
        name: formData.name.trim(),
        email: formData.email.trim(),
      }

      const url = editingId ? `${API_URL}/${editingId}` : API_URL
      const method = editingId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || `Could not ${editingId ? 'edit' : 'add'} record`)
      }

      showNotification(data.message || `Record ${editingId ? 'edited' : 'added'} successfully`, 'success')
      
      setFormData({
        name: '',
        email: '',
      })
      setEditingId(null)
      await fetchUsers(false)
    } catch (error) {
      showNotification(error.message, 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return
    
    setDeletingId(userId)
    setMessage('')

    try {
      const response = await fetch(`${API_URL}/${userId}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Could not delete record')
      }

      showNotification(data.message || 'Record deleted successfully', 'success')
      await fetchUsers(false)
    } catch (error) {
      showNotification(error.message, 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const handleEdit = (user) => {
    setEditingId(user.id)
    setMessage('')
    setFormData({
      name: user.name,
      email: user.email,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setMessage('')
    setFormData({
      name: '',
      email: '',
    })
  }

  return (
    <main className="container">
      <header className="app-header">
        <div className="logo-badge">Hub</div>
        <h1>User Records Directory</h1>
        <p className="subtitle">Easily add, view, edit, and delete user profiles</p>
      </header>

      {/* Main Form container */}
      <section className="form-card animate-fade-in">
        <form onSubmit={handleSubmit}>
          <div className="form-header">
            <h2>{editingId ? 'Edit User Record' : 'Add New Record'}</h2>
            {editingId && <span className="edit-badge">Editing ID: #{editingId}</span>}
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">User Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Rahul Sharma"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email ID</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="e.g. rahul@example.com"
                required
              />
            </div>
          </div>

          <div className="button-group">
            <button type="submit" className="save-btn" disabled={isSubmitting}>
              {isSubmitting ? 'Processing...' : editingId ? 'Update Record' : 'Submit'}
            </button>
            {editingId && (
              <button type="button" className="cancel-btn" onClick={handleCancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Notification banner */}
      {message && (
        <div className={`notification ${messageType} animate-slide-in`}>
          <div className="notif-icon">
            {messageType === 'success' ? '✓' : messageType === 'error' ? '✕' : 'ℹ'}
          </div>
          <p>{message}</p>
        </div>
      )}

      {/* Records section */}
      <section className="directory-list" aria-live="polite">
        <div className="directory-header">
          <h2>Active User Directory</h2>
          <span className="count-badge">{users.length} Records</span>
        </div>

        {isLoading ? (
          <div className="loading-spinner-container">
            <div className="spinner"></div>
            <p>Retrieving user profiles...</p>
          </div>
        ) : users.length > 0 ? (
          <div className="user-grid">
            {users.map((user) => (
              <article key={user.id} className="user-card animate-fade-in">
                <div className="user-card-header">
                  <div className="card-avatar">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="card-title">
                    <h3>{user.name}</h3>
                  </div>
                  <span className="id-tag">ID #{user.id}</span>
                </div>
                
                <div className="user-card-body">
                  <div className="detail-item">
                    <span className="detail-label">Email ID</span>
                    <span className="detail-val">{user.email}</span>
                  </div>
                </div>

                <div className="user-card-actions">
                  <button
                    type="button"
                    className="action-btn edit"
                    onClick={() => handleEdit(user)}
                    disabled={isSubmitting || deletingId === user.id}
                  >
                    Edit Record
                  </button>
                  <button
                    type="button"
                    className="action-btn delete"
                    onClick={() => handleDelete(user.id)}
                    disabled={deletingId === user.id}
                  >
                    {deletingId === user.id ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <p>No user directory profiles found.</p>
            <p className="subtext">Fill in the form above to add a new record.</p>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
