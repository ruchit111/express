import { useEffect, useState } from 'react'
import './App.css'

function App() {
  // Inventory State
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  
  // Product Management Form State
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    category: '',
    quantity: '',
    description: ''
  })
  const [editingProductId, setEditingProductId] = useState(null)

  // Billing / Order Form State
  const [billingForm, setBillingForm] = useState({
    customerName: '',
    customerNumber: '',
    selectedProductId: '',
    quantity: '1'
  })
  
  // Order Cart State
  const [cart, setCart] = useState([])

  // UI Status State
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState('info') // 'success' | 'error' | 'info'
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmittingProduct, setIsSubmittingProduct] = useState(false)
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false)

  // Notifications
  const showNotification = (msg, type = 'info') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => {
      setMessage((prev) => (prev === msg ? '' : prev))
    }, 5000)
  }

  // Fetch Inventory and Orders
  const fetchData = async () => {
    setIsLoading(true)
    try {
      // Fetch products
      const prodRes = await fetch('/api/products')
      if (!prodRes.ok) throw new Error('Could not fetch products')
      const prodData = await prodRes.json()
      setProducts(prodData)

      // Fetch orders
      const ordRes = await fetch('/api/orders')
      if (!ordRes.ok) throw new Error('Could not fetch orders')
      const ordData = await ordRes.json()
      setOrders(ordData)
    } catch (error) {
      console.error(error)
      showNotification('Failed to connect to the backend. Please ensure the backend server is running.', 'error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // ---------------------------------------------
  // PRODUCT CRUD HANDLERS
  // ---------------------------------------------
  const handleProductInputChange = (e) => {
    const { name, value } = e.target
    setProductForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleProductSubmit = async (e) => {
    e.preventDefault()
    setIsSubmittingProduct(true)

    const payload = {
      name: productForm.name.trim(),
      price: Number(productForm.price),
      category: productForm.category.trim(),
      quantity: Number(productForm.quantity),
      description: productForm.description.trim()
    }

    try {
      const url = editingProductId ? `/api/products/${editingProductId}` : '/api/products'
      const method = editingProductId ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Error saving product')
      }

      showNotification(data.message || 'Product saved successfully', 'success')
      
      // Reset Form
      setProductForm({
        name: '',
        price: '',
        category: '',
        quantity: '',
        description: ''
      })
      setEditingProductId(null)

      // Refresh Data
      await fetchData()
    } catch (error) {
      showNotification(error.message, 'error')
    } finally {
      setIsSubmittingProduct(false)
    }
  }

  const handleEditProductClick = (product) => {
    setEditingProductId(product.id)
    setProductForm({
      name: product.name,
      price: product.price,
      category: product.category,
      quantity: product.quantity,
      description: product.description || ''
    })
    window.scrollTo({ top: 150, behavior: 'smooth' })
  }

  const handleDeleteProductClick = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Error deleting product')
      }

      showNotification(data.message || 'Product deleted successfully', 'success')
      await fetchData()
    } catch (error) {
      showNotification(error.message, 'error')
    }
  }

  const handleCancelProductEdit = () => {
    setEditingProductId(null)
    setProductForm({
      name: '',
      price: '',
      category: '',
      quantity: '',
      description: ''
    })
  }

  // ---------------------------------------------
  // BILLING & ORDER HANDLERS
  // ---------------------------------------------
  const handleBillingInputChange = (e) => {
    const { name, value } = e.target
    setBillingForm(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleAddItemToCart = (e) => {
    e.preventDefault()

    const productId = Number(billingForm.selectedProductId)
    const qtyToAdd = Number(billingForm.quantity)

    if (!productId) {
      showNotification('Please select a product first.', 'error')
      return
    }

    if (isNaN(qtyToAdd) || qtyToAdd <= 0) {
      showNotification('Please enter a valid quantity.', 'error')
      return
    }

    const product = products.find(p => p.id === productId)
    if (!product) {
      showNotification('Selected product not found.', 'error')
      return
    }

    // Check available stock
    const existingCartItem = cart.find(item => item.productId === productId)
    const currentCartQty = existingCartItem ? existingCartItem.quantity : 0
    const totalProposedQty = currentCartQty + qtyToAdd

    if (totalProposedQty > product.quantity) {
      showNotification(`Cannot add. Available stock for ${product.name} is ${product.quantity}. You have ${currentCartQty} in cart and tried to add ${qtyToAdd} more.`, 'error')
      return
    }

    if (existingCartItem) {
      // Update quantity
      setCart(prevCart => 
        prevCart.map(item => 
          item.productId === productId 
            ? { ...item, quantity: totalProposedQty, total: product.price * totalProposedQty }
            : item
        )
      )
    } else {
      // Add new item
      const newItem = {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: qtyToAdd,
        total: product.price * qtyToAdd
      }
      setCart(prevCart => [...prevCart, newItem])
    }

    // Reset selector
    setBillingForm(prev => ({
      ...prev,
      selectedProductId: '',
      quantity: '1'
    }))

    showNotification(`Added ${product.name} to cart.`, 'success')
  }

  const handleRemoveCartItem = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId))
  }

  const handlePlaceOrderSubmit = async (e) => {
    e.preventDefault()

    if (!billingForm.customerName.trim()) {
      showNotification('Customer Name is required to place an order.', 'error')
      return
    }
    if (!billingForm.customerNumber.trim()) {
      showNotification('Customer Number is required to place an order.', 'error')
      return
    }
    if (cart.length === 0) {
      showNotification('Please add at least one product to the cart.', 'error')
      return
    }

    setIsSubmittingOrder(true)
    const payload = {
      customerName: billingForm.customerName.trim(),
      customerNumber: billingForm.customerNumber.trim(),
      items: cart
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to place order')
      }

      showNotification('Order placed successfully!', 'success')
      
      // Reset checkout form & cart
      setCart([])
      setBillingForm(prev => ({
        ...prev,
        customerName: '',
        customerNumber: '',
        selectedProductId: '',
        quantity: '1'
      }))

      // Refresh data (stock quantities and orders list)
      await fetchData()
    } catch (error) {
      showNotification(error.message, 'error')
    } finally {
      setIsSubmittingOrder(false)
    }
  }

  // ---------------------------------------------
  // CALCULATED METRICS
  // ---------------------------------------------
  const totalProducts = products.length
  const totalOrders = orders.length
  const totalSales = orders.reduce((sum, order) => sum + order.grandTotal, 0)
  const lowStockProducts = products.filter(p => p.quantity < 5).length

  // Grand Total of Active Cart
  const grandCartTotal = cart.reduce((sum, item) => sum + item.total, 0)

  // Selected Product details for Billing section
  const selectedProduct = products.find(p => p.id === Number(billingForm.selectedProductId))

  return (
    <main className="container animate-fade-in">
      {/* Title Header Bar */}
      <header className="app-header-bar">
        <h1>Inventory & Billing System</h1>
      </header>

      {/* Statistics Dashboard Panels */}
      <section className="stats-row">
        <div className="stat-card">
          <span className="stat-label">Total Products</span>
          <span className="stat-value text-blue">{totalProducts}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Orders</span>
          <span className="stat-value text-blue">{totalOrders}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Total Sales</span>
          <span className="stat-value text-green">₹ {totalSales.toLocaleString('en-IN')}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Low Stock</span>
          <span className={`stat-value ${lowStockProducts > 0 ? 'text-red animate-pulse' : 'text-blue'}`}>
            {lowStockProducts}
          </span>
        </div>
      </section>

      {/* Global Alerts / Notification banner */}
      {message && (
        <div className={`notification ${messageType} animate-slide-in`}>
          <div className="notif-icon">
            {messageType === 'success' ? '✓' : messageType === 'error' ? '✕' : 'ℹ'}
          </div>
          <p>{message}</p>
        </div>
      )}

      {/* Product Management Section */}
      <section className="dashboard-section form-card">
        <div className="section-title-bar">
          <h2>Product Management</h2>
        </div>
        
        <form onSubmit={handleProductSubmit} className="product-form">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Product Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={productForm.name}
                onChange={handleProductInputChange}
                placeholder="Product Name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="price">Price</label>
              <input
                type="number"
                id="price"
                name="price"
                min="0"
                step="any"
                value={productForm.price}
                onChange={handleProductInputChange}
                placeholder="Price"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category</label>
              <input
                type="text"
                id="category"
                name="category"
                value={productForm.category}
                onChange={handleProductInputChange}
                placeholder="Category"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="quantity">Quantity (Stock)</label>
              <input
                type="number"
                id="quantity"
                name="quantity"
                min="0"
                value={productForm.quantity}
                onChange={handleProductInputChange}
                placeholder="Quantity"
                required
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={productForm.description}
                onChange={handleProductInputChange}
                placeholder="Description"
                rows="2"
              ></textarea>
            </div>
          </div>

          <div className="button-group">
            <button type="submit" className="btn-primary" disabled={isSubmittingProduct}>
              {isSubmittingProduct ? 'Saving...' : editingProductId ? 'Update Product' : 'Add Product'}
            </button>
            {editingProductId && (
              <button type="button" className="btn-secondary" onClick={handleCancelProductEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* Product Inventory Table */}
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Category</th>
                <th>Stock</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {products.length > 0 ? (
                products.map((product) => (
                  <tr key={product.id} className={product.quantity < 5 ? 'row-low-stock' : ''}>
                    <td className="font-bold">{product.name}</td>
                    <td>₹ {product.price.toLocaleString('en-IN')}</td>
                    <td><span className="category-badge">{product.category}</span></td>
                    <td>
                      <span className={`stock-badge ${product.quantity < 5 ? 'badge-danger' : 'badge-success'}`}>
                        {product.quantity}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="btn-table btn-table-edit"
                          onClick={() => handleEditProductClick(product)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn-table btn-table-delete"
                          onClick={() => handleDeleteProductClick(product.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="table-empty">
                    No products available. Add one above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Place Order / Billing Section */}
      <section className="dashboard-section form-card">
        <div className="section-title-bar">
          <h2>Place Order / Billing</h2>
        </div>

        <form onSubmit={handleAddItemToCart} className="billing-item-form">
          <div className="billing-grid">
            <div className="form-group">
              <label htmlFor="customerName">Customer Name</label>
              <input
                type="text"
                id="customerName"
                name="customerName"
                value={billingForm.customerName}
                onChange={handleBillingInputChange}
                placeholder="Customer Name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="customerNumber">Customer Number</label>
              <input
                type="text"
                id="customerNumber"
                name="customerNumber"
                value={billingForm.customerNumber}
                onChange={handleBillingInputChange}
                placeholder="Customer Number"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="selectedProductId">Select Product</label>
              <select
                id="selectedProductId"
                name="selectedProductId"
                value={billingForm.selectedProductId}
                onChange={handleBillingInputChange}
                required
              >
                <option value="">Select Product</option>
                {products.map(p => (
                  <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                    {p.name} (Price: ₹{p.price}, Stock: {p.quantity}) {p.quantity <= 0 ? '- OUT OF STOCK' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="billingQuantity">Quantity</label>
              <input
                type="number"
                id="billingQuantity"
                name="quantity"
                min="1"
                max={selectedProduct ? selectedProduct.quantity : undefined}
                value={billingForm.quantity}
                onChange={handleBillingInputChange}
                required
              />
            </div>

            <div className="form-group flex-end">
              <button type="submit" className="btn-primary w-full">
                Add Item
              </button>
            </div>
          </div>
        </form>

        {/* Selected Items Cart Preview */}
        <div className="selected-items-box">
          <h3 className="sub-section-title">Selected Items</h3>
          
          {cart.length > 0 ? (
            <div className="cart-list">
              <table className="cart-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item) => (
                    <tr key={item.productId}>
                      <td className="font-bold">{item.name}</td>
                      <td>₹ {item.price.toLocaleString('en-IN')}</td>
                      <td>{item.quantity}</td>
                      <td>₹ {item.total.toLocaleString('en-IN')}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-remove-item"
                          onClick={() => handleRemoveCartItem(item.productId)}
                          title="Remove item"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="cart-summary-footer">
                <div className="grand-total-label">
                  Grand Total : <span className="grand-total-val">₹ {grandCartTotal.toLocaleString('en-IN')}</span>
                </div>
                <button
                  type="button"
                  className="btn-checkout"
                  onClick={handlePlaceOrderSubmit}
                  disabled={isSubmittingOrder}
                >
                  {isSubmittingOrder ? 'Placing Order...' : 'Place Order'}
                </button>
              </div>
            </div>
          ) : (
            <div className="cart-empty-state">
              No items selected. Add products to include them in the order.
            </div>
          )}
        </div>
      </section>

      {/* Order History Section */}
      <section className="dashboard-section form-card">
        <div className="section-title-bar">
          <h2>Order History</h2>
        </div>

        {orders.length > 0 ? (
          <div className="order-history-list">
            {orders.slice().reverse().map((order) => (
              <div key={order.id} className="order-history-card animate-fade-in">
                <div className="order-card-header">
                  <div>
                    <h3 className="customer-title">{order.customerName}</h3>
                    <p className="customer-number">{order.customerNumber}</p>
                    <span className="order-date">
                      {new Date(order.date).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <div className="order-total-price">
                    Total : ₹ {order.grandTotal.toLocaleString('en-IN')}
                  </div>
                </div>
                <div className="order-card-details">
                  <span className="details-header-label">Items:</span>
                  <div className="order-items-grid">
                    {order.items.map((item, idx) => (
                      <span key={idx} className="order-item-tag">
                        {item.name} ({item.quantity} × ₹{item.price})
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <p>No order history found.</p>
            <p className="subtext">Completed orders will be recorded here.</p>
          </div>
        )}
      </section>
    </main>
  )
}

export default App
