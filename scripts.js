import { 
  getProducts, 
  getOrders, 
  createOrder, 
  updateOrder, 
  deleteOrder 
} from './api.js';

// Глобальные переменные
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let orders = [];

// Инициализация
document.addEventListener('DOMContentLoaded', init);

function init() {
  // На главной странице загружаем товары
  if (document.body.id === 'index-page') {
    loadProducts();
    setupFilters();
  }
  
  // На странице корзины загружаем товары из корзины
  if (document.body.id === 'cart-page') {
    loadCart();
    setupOrderForm();
  }
  
  // На странице личного кабинета загружаем заказы
  if (document.body.id === 'orders-page') {
    loadOrders();
    setupOrderActions();
  }
  
  // Универсальные обработчики
  setupNotificationSystem();
  setupModalWindows();
}

// Уведомления
function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = 'block';
  
  setTimeout(() => {
    notification.style.display = 'none';
  }, 5000);
}

function setupNotificationSystem() {
  // Реализация системы уведомлений
}

// Модальные окна
function setupModalWindows() {
  const modals = document.querySelectorAll('.modal');
  const closeButtons = document.querySelectorAll('.close');
  const viewOrderOk = document.getElementById('view-order-ok');
  const editOrderCancel = document.getElementById('edit-order-cancel');
  const deleteOrderNo = document.getElementById('delete-order-no');
  const deleteOrderYes = document.getElementById('delete-order-yes');
  
  closeButtons.forEach(button => {
    button.addEventListener('click', () => {
      modals.forEach(modal => modal.style.display = 'none');
    });
  });
  
  viewOrderOk.addEventListener('click', () => {
    document.getElementById('view-order-modal').style.display = 'none';
  });
  
  editOrderCancel.addEventListener('click', () => {
    document.getElementById('edit-order-modal').style.display = 'none';
  });
  
  deleteOrderNo.addEventListener('click', () => {
    document.getElementById('delete-order-modal').style.display = 'none';
  });
  
  deleteOrderYes.addEventListener('click', async () => {
    const orderId = document.getElementById('delete-order-modal').dataset.orderId;
    try {
      await deleteOrder(orderId);
      showNotification('Заказ успешно удален', 'success');
      loadOrders();
      document.getElementById('delete-order-modal').style.display = 'none';
    } catch (error) {
      showNotification('Ошибка удаления заказа', 'error');
    }
  });
}

// Главная страница
function loadProducts() {
  getProducts().then(data => {
    products = data;
    renderProducts(products);
  });
}

function renderProducts(productsToRender) {
  const grid = document.getElementById('products-grid');
  grid.innerHTML = '';
  
  productsToRender.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${product.image || 'images/placeholder.jpg'}" alt="${product.name}">
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <div class="product-rating">${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}</div>
        <div class="product-price">
          ${product.discount ? `<span class="price-original">${product.price} ₽</span>` : ''}
          <span class="price-current">${product.discount ? product.discountPrice : product.price} ₽</span>
          ${product.discount ? `<span class="price-discount">-${product.discount}%</span>` : ''}
        </div>
        <button class="btn add-to-cart" data-id="${product.id}">Добавить</button>
      </div>
    `;
    grid.appendChild(card);
  });
  
  // Обработчики для добавления в корзину
  document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', (e) => {
      const productId = e.target.dataset.id;
      addToCart(productId);
    });
  });
}

function setupFilters() {
  document.getElementById('apply-filters').addEventListener('click', () => {
    const categoryFilters = Array.from(document.querySelectorAll('input[data-category]:checked'))
      .map(checkbox => checkbox.dataset.category);
      
    const priceFrom = parseInt(document.getElementById('price-from').value) || 0;
    const priceTo = parseInt(document.getElementById('price-to').value) || Infinity;
    const discountOnly = document.getElementById('discount-only').checked;
    
    let filtered = products;
    
    if (categoryFilters.length > 0) {
      filtered = filtered.filter(product => categoryFilters.includes(product.category));
    }
    
    filtered = filtered.filter(product => 
      product.price >= priceFrom && product.price <= priceTo
    );
    
    if (discountOnly) {
      filtered = filtered.filter(product => product.discount > 0);
    }
    
    renderProducts(filtered);
  });
}

function addToCart(productId) {
  if (!cart.includes(productId)) {
    cart.push(productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    showNotification('Товар добавлен в корзину', 'success');
  }
}

// Страница корзины
function loadCart() {
  if (cart.length === 0) {
    document.getElementById('cart-empty').style.display = 'block';
    return;
  }
  
  getProducts().then(allProducts => {
    const cartProducts = allProducts.filter(product => cart.includes(product.id));
    renderCart(cartProducts);
    updateTotalCost();
  });
}

function renderCart(productsInCart) {
  const container = document.getElementById('cart-items');
  container.innerHTML = '';
  
  productsInCart.forEach(product => {
    const item = document.createElement('div');
    item.className = 'product-card';
    item.innerHTML = `
      <img src="${product.image || 'images/placeholder.jpg'}" alt="${product.name}">
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <div class="product-rating">${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}</div>
        <div class="product-price">
          ${product.discount ? `<span class="price-original">${product.price} ₽</span>` : ''}
          <span class="price-current">${product.discount ? product.discountPrice : product.price} ₽</span>
          ${product.discount ? `<span class="price-discount">-${product.discount}%</span>` : ''}
        </div>
        <button class="btn remove-from-cart" data-id="${product.id}">Удалить</button>
      </div>
    `;
    container.appendChild(item);
  });
  
  // Обработчики удаления
  document.querySelectorAll('.remove-from-cart').forEach(button => {
    button.addEventListener('click', (e) => {
      const productId = e.target.dataset.id;
      removeFromCart(productId);
    });
  });
}

function removeFromCart(productId) {
  cart = cart.filter(id => id !== productId);
  localStorage.setItem('cart', JSON.stringify(cart));
  
  if (cart.length === 0) {
    document.getElementById('cart-empty').style.display = 'block';
  }
  
  loadCart();
  updateTotalCost();
}

function updateTotalCost() {
  getProducts().then(allProducts => {
    const cartProducts = allProducts.filter(product => cart.includes(product.id));
    const subtotal = cartProducts.reduce((sum, product) => sum + (product.discountPrice || product.price), 0);
    
    // Расчёт доставки
    const deliveryDate = new Date(document.getElementById('delivery-date').value);
    let deliveryCost = 200;
    
    if (deliveryDate) {
      const day = deliveryDate.getDay();
      const hour = deliveryDate.getHours();
      
      // Выходные дни (суббота, воскресенье)
      if (day === 0 || day === 6) {
        deliveryCost += 300;
      } 
      // Вечернее время в будние дни
      else if (hour >= 18) {
        deliveryCost += 200;
      }
    }
    
    const total = subtotal + deliveryCost;
    document.getElementById('total-cost').textContent = `Итоговая стоимость: ${total} ₽ (стоимость доставки ${deliveryCost} ₽)`;
  });
}

function setupOrderForm() {
  document.getElementById('order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      showNotification('Корзина пуста', 'error');
      return;
    }
    
    const orderData = {
      items: cart,
      name: document.getElementById('name').value,
      email: document.getElementById('email').value,
      phone: document.getElementById('phone').value,
      address: document.getElementById('address').value,
      deliveryDate: document.getElementById('delivery-date').value,
      deliveryTime: document.getElementById('delivery-time').value,
      comment: document.getElementById('comment').value
    };
    
    try {
      await createOrder(orderData);
      showNotification('Заказ успешно оформлен', 'success');
      localStorage.removeItem('cart');
      cart = [];
      window.location.href = 'index.html';
    } catch (error) {
      showNotification('Ошибка оформления заказа', 'error');
    }
  });
  
  // Обновление стоимости при изменении данных
  document.getElementById('delivery-date').addEventListener('change', updateTotalCost);
  document.getElementById('delivery-time').addEventListener('change', updateTotalCost);
  document.getElementById('reset-cart').addEventListener('click', () => {
    localStorage.removeItem('cart');
    cart = [];
    loadCart();
    updateTotalCost();
  });
}

// Личный кабинет
function loadOrders() {
  getOrders().then(data => {
    orders = data;
    renderOrders();
  });
}

function renderOrders() {
  const tbody = document.querySelector('#orders-table tbody');
  tbody.innerHTML = '';
  
  orders.forEach((order, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${formatDateTime(order.created)}</td>
      <td>${order.items.map(item => item.name).join(', ')}</td>
      <td>${order.total} ₽</td>
      <td>${formatDateTime(order.delivery)}<br>${order.deliveryTime}</td>
      <td>
        <button class="action-btn view" data-id="${order.id}">👁️</button>
        <button class="action-btn edit" data-id="${order.id}">✏️</button>
        <button class="action-btn delete" data-id="${order.id}">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  // Обработчики действий
  document.querySelectorAll('.view').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const orderId = e.target.dataset.id;
      showOrderDetails(orderId);
    });
  });
  
  document.querySelectorAll('.edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const orderId = e.target.dataset.id;
      showEditOrderModal(orderId);
    });
  });
  
  document.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const orderId = e.target.dataset.id;
      showDeleteOrderModal(orderId);
    });
  });
}

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function showOrderDetails(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  
  const details = document.getElementById('view-order-details');
  details.innerHTML = `
    <p><strong>Дата оформления:</strong> ${formatDateTime(order.created)}</p>
    <p><strong>Имя:</strong> ${order.name}</p>
    <p><strong>Номер телефона:</strong> ${order.phone}</p>
    <p><strong>Email:</strong> ${order.email}</p>
    <p><strong>Адрес доставки:</strong> ${order.address}</p>
    <p><strong>Дата доставки:</strong> ${formatDateTime(order.delivery)}</p>
    <p><strong>Время доставки:</strong> ${order.deliveryTime}</p>
    <p><strong>Состав заказа:</strong> ${order.items.map(item => item.name).join(', ')}</p>
    <p><strong>Стоимость:</strong> ${order.total} ₽</p>
    <p><strong>Комментарий:</strong> ${order.comment || 'Нет'}</p>
  `;
  
  document.getElementById('view-order-modal').style.display = 'block';
}

function showEditOrderModal(orderId) {
  const order = orders.find(o => o.id === orderId);
  if (!order) return;
  
  document.getElementById('edit-order-date').value = formatDateTime(order.created);
  document.getElementById('edit-order-name').value = order.name;
  document.getElementById('edit-order-phone').value = order.phone;
  document.getElementById('edit-order-email').value = order.email;
  document.getElementById('edit-order-address').value = order.address;
  document.getElementById('edit-order-delivery-date').value = order.delivery.split('T')[0];
  document.getElementById('edit-order-delivery-time').value = order.deliveryTime;
  document.getElementById('edit-order-comment').value = order.comment || '';
  
  document.getElementById('edit-order-form').dataset.orderId = orderId;
  document.getElementById('edit-order-modal').style.display = 'block';
}

function showDeleteOrderModal(orderId) {
  document.getElementById('delete-order-modal').dataset.orderId = orderId;
  document.getElementById('delete-order-modal').style.display = 'block';
}

function setupOrderActions() {
  document.getElementById('edit-order-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const orderId = e.target.dataset.orderId;
    
    const orderData = {
      name: document.getElementById('edit-order-name').value,
      email: document.getElementById('edit-order-email').value,
      phone: document.getElementById('edit-order-phone').value,
      address: document.getElementById('edit-order-address').value,
      delivery: document.getElementById('edit-order-delivery-date').value,
      deliveryTime: document.getElementById('edit-order-delivery-time').value,
      comment: document.getElementById('edit-order-comment').value
    };
    
    try {
      await updateOrder(orderId, orderData);
      showNotification('Заказ успешно обновлен', 'success');
      loadOrders();
      document.getElementById('edit-order-modal').style.display = 'none';
    } catch (error) {
      showNotification('Ошибка обновления заказа', 'error');
    }
  });
}
