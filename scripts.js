import { 
  getProducts, 
  getOrders, 
  createOrder, 
  updateOrder, 
  deleteOrder,
  getAutocompleteSuggestions
} from './api.js';

// Глобальные переменные
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let isLoading = false;
let lastSearchQuery = '';
let activeFilters = {
  categories: [],
  minPrice: 0,
  maxPrice: 10000,
  discountOnly: false,
  sort: 'rating-desc'
};

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', init);

function init() {
  if (!document.body.id) {
    document.body.id = window.location.pathname.split('/').pop().split('.')[0] || 'index-page';
  }

  updateCartCount();

  if (document.body.id === 'index-page') {
    setupSearch();
    setupFilters();
    setupSort();
    loadProducts();
  }
  
  if (document.body.id === 'cart-page') {
    loadCartItems();
    setupOrderForm();
  }
  
  if (document.body.id === 'orders-page') {
    loadUserOrders();
    setupOrderActions();
  }
  
  setupNotificationSystem();
  setupModalWindows();
}

// Уведомления
function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  if (!notification) return;
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = 'block';
  setTimeout(() => { notification.style.display = 'none'; }, 5000);
}

function setupNotificationSystem() {}

// Модальные окна
function setupModalWindows() {
  document.querySelectorAll('.close').forEach(btn => 
    btn.addEventListener('click', closeAllModals)
  );
  
  const deleteYes = document.getElementById('delete-order-yes');
  if (deleteYes) {
    deleteYes.addEventListener('click', async () => {
      const orderId = document.getElementById('delete-order-modal').dataset.orderId;
      if (orderId) {
        try {
          await deleteOrder(parseInt(orderId));
          showNotification('Заказ успешно удален', 'success');
          if (document.body.id === 'orders-page') loadUserOrders();
          closeAllModals();
        } catch (error) {
          showNotification('Ошибка удаления заказа: ' + error.message, 'error');
        }
      }
    });
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}

// Обновление счетчика корзины
function updateCartCount() {
  const el = document.getElementById('cart-count');
  if (el) el.textContent = cart.length;
}

// Поиск
function setupSearch() {
  const input = document.getElementById('search-input');
  const button = document.getElementById('search-button');
  const results = document.getElementById('autocomplete-results');
  
  if (!input || !button) return;
  
  input.addEventListener('input', debounce(async () => {
    const q = input.value.trim();
    if (q.length >= 2) {
      const suggestions = await getAutocompleteSuggestions(q);
      renderAutocomplete(suggestions);
    } else {
      results.innerHTML = '';
      results.classList.remove('show');
    }
  }, 300));
  
  results.addEventListener('click', (e) => {
    if (e.target.tagName === 'DIV') {
      input.value = e.target.textContent;
      results.innerHTML = '';
      results.classList.remove('show');
      lastSearchQuery = input.value;
      loadProducts();
    }
  });
  
  button.addEventListener('click', () => {
    lastSearchQuery = input.value.trim();
    loadProducts();
  });
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      lastSearchQuery = input.value.trim();
      loadProducts();
    }
  });
}

function renderAutocomplete(suggestions) {
  const results = document.getElementById('autocomplete-results');
  if (!results) return;
  
  if (suggestions.length === 0) {
    results.innerHTML = '';
    results.classList.remove('show');
    return;
  }
  
  results.innerHTML = suggestions.slice(0, 5).map(s => `<div>${s}</div>`).join('');
  results.classList.add('show');
}

// Фильтры и сортировка
function setupFilters() {
  const applyBtn = document.getElementById('apply-filters');
  const loadMore = document.getElementById('load-more');
  
  if (applyBtn) {
    applyBtn.addEventListener('click', () => {
      activeFilters.minPrice = parseInt(document.getElementById('price-from').value) || 0;
      activeFilters.maxPrice = parseInt(document.getElementById('price-to').value) || 100000;
      activeFilters.discountOnly = document.getElementById('discount-only').checked;
      activeFilters.categories = Array.from(
        document.querySelectorAll('#categories-filter input[type="checkbox"]:checked')
      ).map(cb => cb.value);
      
      loadProducts();
    });
  }
  
  if (loadMore) loadMore.style.display = 'none';
}

function setupSort() {
  const select = document.getElementById('sort-options');
  if (select) {
    select.addEventListener('change', (e) => {
      activeFilters.sort = e.target.value;
      loadProducts();
    });
  }
}

// Загрузка товаров
async function loadProducts() {
  if (isLoading) return;
  isLoading = true;
  
  const grid = document.getElementById('products-grid');
  if (grid) grid.innerHTML = '<div class="loading">Загрузка товаров...</div>';
  
  try {
    // Загружаем все товары
    const result = await getProducts({ page: 1, per_page: 1000 });
    let allProducts = result.goods;
    
    // Клиентская фильтрация
    if (activeFilters.categories.length > 0) {
      allProducts = allProducts.filter(p => 
        activeFilters.categories.includes(p.main_category.toLowerCase())
      );
    }
    
    allProducts = allProducts.filter(p => {
      const price = p.discount_price ?? p.actual_price;
      return price >= activeFilters.minPrice && price <= activeFilters.maxPrice;
    });
    
    if (activeFilters.discountOnly) {
      allProducts = allProducts.filter(p => 
        p.discount_price != null && p.discount_price < p.actual_price
      );
    }
    
    // Сортировка
    allProducts.sort((a, b) => {
      const aPrice = a.discount_price ?? a.actual_price;
      const bPrice = b.discount_price ?? b.actual_price;
      const aRating = a.rating ?? 0;
      const bRating = b.rating ?? 0;
      
      switch (activeFilters.sort) {
        case 'price-asc': return aPrice - bPrice;
        case 'price-desc': return bPrice - aPrice;
        case 'rating-asc': return aRating - bRating;
        case 'rating-desc': return bRating - aRating;
        default: return bRating - aRating;
      }
    });
    
    products = allProducts;
    
    // Обновляем категории в сайдбаре
    const categories = new Set();
    result.goods.forEach(p => {
      if (p.main_category) categories.add(p.main_category.toLowerCase());
    });
    renderCategoriesFilter(categories);
    
    renderProducts();
    
  } catch (error) {
    console.error('Ошибка загрузки товаров:', error);
    if (grid) {
      grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:#e74c3c;">Ошибка загрузки</p>';
    }
    showNotification('Не удалось загрузить товары', 'error');
  } finally {
    isLoading = false;
  }
}

function renderCategoriesFilter(categories) {
  const container = document.getElementById('categories-filter');
  if (!container) return;
  
  container.innerHTML = '';
  Array.from(categories).sort().forEach(cat => {
    const label = document.createElement('label');
    label.innerHTML = `<input type="checkbox" value="${cat}" /> ${cat.charAt(0).toUpperCase() + cat.slice(1)}`;
    container.appendChild(label);
  });
  
  activeFilters.categories.forEach(cat => {
    const cb = container.querySelector(`input[value="${cat}"]`);
    if (cb) cb.checked = true;
  });
}

function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;
  
  grid.innerHTML = '';
  
  if (products.length === 0) {
    grid.innerHTML = '<p style="grid-column:1/-1;text-align:center;padding:40px;">Товары не найдены</p>';
    return;
  }
  
  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      <img src="${product.image_url?.trim() || 'https://via.placeholder.com/200x200?text=No+Image'}" alt="${product.name}">
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <div class="product-category">${product.main_category}</div>
        <div class="product-rating">
          ${'★'.repeat(Math.floor(product.rating || 0))}${'☆'.repeat(5 - Math.floor(product.rating || 0))}
          (${product.rating ? product.rating.toFixed(1) : '0.0'})
        </div>
        <div class="product-price">
          ${product.discount_price && product.discount_price < product.actual_price ? 
            `<span class="price-original">${product.actual_price.toLocaleString()} ₽</span>
             <span class="price-current">${product.discount_price.toLocaleString()} ₽</span>` :
            `<span class="price-current">${product.actual_price.toLocaleString()} ₽</span>`
          }
        </div>
        <button class="add-to-cart" data-id="${product.id}">Добавить</button>
      </div>
    `;
    grid.appendChild(card);
  });
  
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id);
      if (!cart.includes(id)) {
        cart.push(id);
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        showNotification('Товар добавлен в корзину', 'success');
      }
    });
  });
}

// Корзина
function removeFromCart(productId) {
  cart = cart.filter(id => id !== productId);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
}

async function loadCartItems() {
  if (cart.length === 0) {
    document.getElementById('cart-items').innerHTML = `
      <p style="grid-column:1/-1;text-align:center;padding:40px;">
        Корзина пуста. <a href="index.html" style="color:#e74c3c;">Перейдите в каталог</a>
      </p>`;
    return;
  }
  
  try {
    const allProducts = await getProducts({ page: 1, per_page: 100 });
    const cartProducts = allProducts.goods.filter(p => cart.includes(p.id));
    renderCartItems(cartProducts);
    updateTotalCost();
  } catch (error) {
    console.error('Ошибка загрузки корзины:', error);
    document.getElementById('cart-items').innerHTML = `
      <p style="grid-column:1/-1;text-align:center;color:#e74c3c;">Ошибка загрузки корзины</p>`;
  }
}

function renderCartItems(products) {
  const container = document.getElementById('cart-items');
  if (!container) return;
  container.innerHTML = '';
  
  products.forEach(product => {
    const item = document.createElement('div');
    item.className = 'product-card';
    item.innerHTML = `
      <img src="${product.image_url?.trim() || 'https://via.placeholder.com/200x200?text=No+Image'}" alt="${product.name}">
      <div class="product-info">
        <h3>${product.name}</h3>
        <div class="product-price">${(product.discount_price || product.actual_price).toLocaleString()} ₽</div>
        <button class="remove-from-cart" data-id="${product.id}">Удалить</button>
      </div>
    `;
    container.appendChild(item);
  });
  
  document.querySelectorAll('.remove-from-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = parseInt(e.target.dataset.id);
      removeFromCart(id);
      if (cart.length === 0) {
        document.getElementById('cart-items').innerHTML = `
          <p style="grid-column:1/-1;text-align:center;padding:40px;">
            Корзина пуста. <a href="index.html" style="color:#e74c3c;">Перейдите в каталог</a>
          </p>`;
      } else {
        loadCartItems();
      }
      updateTotalCost();
    });
  });
}

function updateTotalCost() {
  if (cart.length === 0) return;
  
  getProducts({ page: 1, per_page: 100 }).then(res => {
    const map = new Map(res.goods.map(p => [p.id, p]));
    const total = cart.reduce((sum, id) => {
      const p = map.get(id);
      return sum + (p ? (p.discount_price || p.actual_price) : 0);
    }, 0);
    
    const el = document.getElementById('total-cost');
    if (el) el.textContent = `Итого: ${total.toLocaleString()} ₽`;
  });
}

// Форма заказа
function setupOrderForm() {
  const form = document.getElementById('order-form');
  if (!form) return;
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (cart.length === 0) return showNotification('Корзина пуста', 'error');
    
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    const deliveryTime = document.getElementById('delivery-time').value;
    const dateInput = document.getElementById('delivery-date').value;
    
    // Формат даты: dd.mm.yyyy
    let deliveryDate = '';
    if (dateInput) {
      const d = new Date(dateInput);
      deliveryDate = `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
    }
    
    if (!name || !email || !phone || !address || !deliveryDate || !deliveryTime) {
      return showNotification('Заполните все поля', 'error');
    }
    
    try {
      await createOrder({
        name, email, phone, address,
        deliveryDate, deliveryTime,
        subscribe: document.getElementById('subscribe')?.checked || false,
        comment: document.getElementById('comment')?.value.trim() || '',
        items: [...cart]
      });
      
      localStorage.removeItem('cart');
      cart = [];
      updateCartCount();
      showNotification('Заказ оформлен!', 'success');
      setTimeout(() => window.location.href = 'index.html', 2000);
    } catch (error) {
      showNotification('Ошибка оформления: ' + (error.message || 'Попробуйте позже'), 'error');
    }
  });
}

// Личный кабинет
async function loadUserOrders() {
  try {
    const orders = await getOrders();
    if (orders.length === 0) {
      renderOrders([]);
      return;
    }
    
    const allProducts = await getProducts({ page: 1, per_page: 100 });
    const productMap = new Map(allProducts.goods.map(p => [p.id, p]));
    
    const ordersWithTotal = orders.map(order => {
      const total = order.good_ids.reduce((sum, id) => {
        const p = productMap.get(id);
        return sum + (p ? (p.discount_price || p.actual_price) : 0);
      }, 0);
      return { ...order, total };
    });
    
    renderOrders(ordersWithTotal);
  } catch (error) {
    console.error('Ошибка загрузки заказов:', error);
    showNotification('Ошибка загрузки заказов', 'error');
  }
}

function renderOrders(orders) {
  const tbody = document.querySelector('#orders-table tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  
  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;">Нет заказов</td></tr>';
    return;
  }
  
  orders.forEach((order, i) => {
    const created = new Date(order.created_at).toLocaleString('ru-RU');
    const delivery = new Date(order.delivery_date).toLocaleDateString('ru-RU');
    
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${i + 1}</td>
      <td>${created}</td>
      <td>${order.good_ids.join(', ')}</td>
      <td>${order.total.toLocaleString()} ₽</td>
      <td>${delivery}<br>${order.delivery_interval}</td>
      <td>
        <button class="action-btn view" data-id="${order.id}">👁️</button>
        <button class="action-btn edit" data-id="${order.id}">✏️</button>
        <button class="action-btn delete" data-id="${order.id}">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  // Добавьте обработчики кнопок при необходимости
}

// Вспомогательные функции
function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

window.updateCartCount = updateCartCount;
window.showNotification = showNotification;
