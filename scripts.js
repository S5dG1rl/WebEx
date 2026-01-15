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
let currentPage = 1;
let productsPerPage = 12;
let allCategories = new Set();
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
  // Устанавливаем ID страницы для условий
  if (!document.body.id) {
    document.body.id = window.location.pathname.split('/').pop().split('.')[0] || 'index-page';
  }

  // На всех страницах отображаем количество товаров в корзине
  updateCartCount();

  // Страница каталога
  if (document.body.id === 'index-page') {
    setupSearch();
    setupFilters();
    setupSort();
    loadProducts();
  }
  
  // Страница корзины
  if (document.body.id === 'cart-page') {
    loadCartItems();
    setupOrderForm();
  }
  
  // Страница заказов
  if (document.body.id === 'orders-page') {
    loadUserOrders();
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
  // Система уведомлений уже настроена в функции showNotification
}

// Модальные окна
function setupModalWindows() {
  const closeButtons = document.querySelectorAll('.close');
  const viewOrderOk = document.getElementById('view-order-ok');
  const editOrderCancel = document.getElementById('edit-order-cancel');
  const deleteOrderNo = document.getElementById('delete-order-no');
  const deleteOrderYes = document.getElementById('delete-order-yes');
  
  closeButtons.forEach(button => {
    button.addEventListener('click', closeAllModals);
  });
  
  if (viewOrderOk) {
    viewOrderOk.addEventListener('click', closeAllModals);
  }
  
  if (editOrderCancel) {
    editOrderCancel.addEventListener('click', closeAllModals);
  }
  
  if (deleteOrderNo) {
    deleteOrderNo.addEventListener('click', closeAllModals);
  }
  
  if (deleteOrderYes) {
    deleteOrderYes.addEventListener('click', async () => {
      const orderId = document.getElementById('delete-order-modal').dataset.orderId;
      if (orderId) {
        try {
          await deleteOrder(parseInt(orderId));
          showNotification('Заказ успешно удален', 'success');
          if (document.body.id === 'orders-page') {
            loadUserOrders();
          }
          closeAllModals();
        } catch (error) {
          showNotification('Ошибка удаления заказа: ' + error.message, 'error');
        }
      }
    });
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
}

// Обновление счетчика корзины
function updateCartCount() {
  const countElement = document.getElementById('cart-count');
  if (countElement) {
    countElement.textContent = cart.length;
  }
}

// Поиск товаров
function setupSearch() {
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const autocompleteResults = document.getElementById('autocomplete-results');
  
  // Автодополнение
  searchInput.addEventListener('input', debounce(async () => {
    const query = searchInput.value.trim();
    if (query.length >= 2) {
      const suggestions = await getAutocompleteSuggestions(query);
      renderAutocomplete(suggestions);
    } else {
      autocompleteResults.innerHTML = '';
      autocompleteResults.classList.remove('show');
    }
  }, 300));
  
  // Выбор из автодополнения
  autocompleteResults.addEventListener('click', (e) => {
    if (e.target.tagName === 'DIV') {
      searchInput.value = e.target.textContent;
      autocompleteResults.innerHTML = '';
      autocompleteResults.classList.remove('show');
      lastSearchQuery = searchInput.value;
      loadProducts();
    }
  });
  
  // Поиск по кнопке
  searchButton.addEventListener('click', () => {
    lastSearchQuery = searchInput.value.trim();
    currentPage = 1;
    loadProducts();
  });
  
  // Поиск по Enter
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      lastSearchQuery = searchInput.value.trim();
      currentPage = 1;
      loadProducts();
    }
  });
}

function renderAutocomplete(suggestions) {
  const autocompleteResults = document.getElementById('autocomplete-results');
  if (suggestions.length === 0) {
    autocompleteResults.innerHTML = '';
    autocompleteResults.classList.remove('show');
    return;
  }
  
  autocompleteResults.innerHTML = suggestions.slice(0, 5).map(suggestion => 
    `<div>${suggestion}</div>`
  ).join('');
  
  autocompleteResults.classList.add('show');
}

// Фильтрация и сортировка
function setupFilters() {
  document.getElementById('apply-filters').addEventListener('click', () => {
    activeFilters.minPrice = parseInt(document.getElementById('price-from').value) || 0;
    activeFilters.maxPrice = parseInt(document.getElementById('price-to').value) || 10000;
    activeFilters.discountOnly = document.getElementById('discount-only').checked;
    
    // Получаем выбранные категории
    activeFilters.categories = Array.from(document.querySelectorAll('#categories-filter input[type="checkbox"]:checked'))
      .map(checkbox => checkbox.value);
    
    currentPage = 1;
    loadProducts();
  });
  
  document.getElementById('load-more').addEventListener('click', () => {
    currentPage++;
    loadProducts(false);
  });
}

function setupSort() {
  document.getElementById('sort-options').addEventListener('change', (e) => {
    activeFilters.sort = e.target.value;
    currentPage = 1;
    loadProducts();
  });
}

// Загрузка и отображение товаров
async function loadProducts(shouldReset = true) {
  if (isLoading) return;
  
  isLoading = true;
  const grid = document.getElementById('products-grid');
  
  if (shouldReset) {
    grid.innerHTML = '<div class="loading">Загрузка товаров...</div>';
    currentPage = 1;
  }
  
  try {
    const params = {
      page: 1,
      per_page: currentPage * productsPerPage,
      query: lastSearchQuery,
      categories: activeFilters.categories,
      min_price: activeFilters.minPrice,
      max_price: activeFilters.maxPrice,
      discount_only: activeFilters.discountOnly,
      sort: activeFilters.sort
    };
    
    const data = await getProducts(params);
    products = data;
    
    // Собираем уникальные категории для сайдбара
    if (shouldReset) {
      allCategories.clear();
      products.forEach(product => {
        if (product.main_category) {
          allCategories.add(product.main_category.toLowerCase());
        }
      });
      renderCategoriesFilter();
    }
    
    renderProducts(shouldReset);
    
    // Показываем кнопку "Загрузить еще", если есть еще товары
    const loadMoreBtn = document.getElementById('load-more');
    loadMoreBtn.style.display = products.length >= currentPage * productsPerPage ? 'block' : 'none';
    
    if (products.length === 0 && shouldReset) {
      grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 40px; font-size: 1.2rem; color: #7f8c8d;">По вашему запросу ничего не найдено</p>';
    }
  } catch (error) {
    console.error('Ошибка загрузки товаров:', error);
    grid.innerHTML = `<p style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #e74c3c;">Ошибка загрузки товаров. Попробуйте обновить страницу.</p>`;
    showNotification('Ошибка загрузки товаров', 'error');
  } finally {
    isLoading = false;
  }
}

function renderCategoriesFilter() {
  const container = document.getElementById('categories-filter');
  container.innerHTML = '';
  
  // Сортируем категории по алфавиту
  const sortedCategories = Array.from(allCategories).sort();
  
  sortedCategories.forEach(category => {
    const label = document.createElement('label');
    label.innerHTML = `
      <input type="checkbox" value="${category}" /> 
      ${category.charAt(0).toUpperCase() + category.slice(1)}
    `;
    container.appendChild(label);
  });
  
  // Восстанавливаем выбранные фильтры
  activeFilters.categories.forEach(category => {
    const checkbox = container.querySelector(`input[value="${category}"]`);
    if (checkbox) checkbox.checked = true;
  });
}

function renderProducts(shouldReset = true) {
  const grid = document.getElementById('products-grid');
  if (shouldReset) {
    grid.innerHTML = '';
  }
  
  if (products.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1 / -1; text-align: center; padding: 40px; font-size: 1.2rem; color: #7f8c8d;">Товары не найдены</p>';
    return;
  }
  
  // Определяем, какие товары отображать (только новые при загрузке еще)
  const startIndex = shouldReset ? 0 : (currentPage - 1) * productsPerPage;
  const endIndex = Math.min(currentPage * productsPerPage, products.length);
  
  for (let i = startIndex; i < endIndex; i++) {
    const product = products[i];
    const productElement = document.createElement('div');
    productElement.className = 'product-card';
    productElement.innerHTML = `
      <img src="${product.image_url || 'https://via.placeholder.com/200x200?text=No+Image'}" alt="${product.name}">
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <div class="product-category">${product.main_category} / ${product.sub_category}</div>
        <div class="product-rating">
          ${'★'.repeat(Math.floor(product.rating || 0))}${'☆'.repeat(5 - Math.floor(product.rating || 0))}
          (${product.rating ? product.rating.toFixed(1) : '0.0'})
        </div>
        <div class="product-price">
          ${product.discount_price && product.discount_price < product.actual_price ? 
            `<span class="price-original">${product.actual_price.toLocaleString()} ₽</span>
            <span class="price-current">${product.discount_price.toLocaleString()} ₽</span>
            <span class="price-discount">-${Math.round((1 - product.discount_price/product.actual_price) * 100)}%</span>` : 
            `<span class="price-current">${product.actual_price.toLocaleString()} ₽</span>`
          }
        </div>
        <button class="add-to-cart" data-id="${product.id}">
          Добавить в корзину
        </button>
      </div>
    `;
    grid.appendChild(productElement);
  }
  
  // Добавляем обработчики для кнопок "Добавить в корзину"
  document.querySelectorAll('.add-to-cart').forEach(button => {
    button.addEventListener('click', (e) => {
      const productId = parseInt(e.target.dataset.id);
      addToCart(productId);
    });
  });
}

// Работа с корзиной
function addToCart(productId) {
  if (!cart.includes(productId)) {
    cart.push(productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showNotification('Товар добавлен в корзину', 'success');
  } else {
    showNotification('Этот товар уже в корзине', 'info');
  }
}

function removeFromCart(productId) {
  cart = cart.filter(id => id !== productId);
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
}

// Страница корзины
async function loadCartItems() {
  if (cart.length === 0) {
    document.getElementById('cart-items').innerHTML = `
      <p style="grid-column: 1 / -1; text-align: center; padding: 40px; font-size: 1.2rem;">
        Корзина пуста. <a href="index.html" style="color: #e74c3c; text-decoration: none;">Перейдите в каталог</a>, чтобы добавить товары.
      </p>
    `;
    document.getElementById('order-form').style.display = 'none';
    return;
  }
  
  try {
    // Загружаем товары по ID из корзины
    const allProducts = await getProducts({ page: 1, per_page: 100 });
    const cartProducts = allProducts.filter(product => cart.includes(product.id));
    
    renderCartItems(cartProducts);
    updateTotalCost();
  } catch (error) {
    console.error('Ошибка загрузки товаров корзины:', error);
    document.getElementById('cart-items').innerHTML = `
      <p style="grid-column: 1 / -1; text-align: center; padding: 40px; color: #e74c3c;">
        Ошибка загрузки товаров корзины. Попробуйте обновить страницу.
      </p>
    `;
  }
}

function renderCartItems(products) {
  const container = document.getElementById('cart-items');
  container.innerHTML = '';
  
  products.forEach(product => {
    const item = document.createElement('div');
    item.className = 'product-card';
    item.innerHTML = `
      <img src="${product.image_url || 'https://via.placeholder.com/200x200?text=No+Image'}" alt="${product.name}">
      <div class="product-info">
        <h3 class="product-name">${product.name}</h3>
        <div class="product-category">${product.main_category}</div>
        <div class="product-price">
          ${product.discount_price && product.discount_price < product.actual_price ? 
            `<span class="price-original">${product.actual_price.toLocaleString()} ₽</span>
            <span class="price-current">${product.discount_price.toLocaleString()} ₽</span>` : 
            `<span class="price-current">${product.actual_price.toLocaleString()} ₽</span>`
          }
        </div>
        <button class="remove-from-cart" data-id="${product.id}">
          Удалить из корзины
        </button>
      </div>
    `;
    container.appendChild(item);
  });
  
  // Добавляем обработчики для кнопок "Удалить из корзины"
  document.querySelectorAll('.remove-from-cart').forEach(button => {
    button.addEventListener('click', (e) => {
      const productId = parseInt(e.target.dataset.id);
      removeFromCart(productId);
      if (cart.length === 0) {
        document.getElementById('cart-items').innerHTML = `
          <p style="grid-column: 1 / -1; text-align: center; padding: 40px; font-size: 1.2rem;">
            Корзина пуста. <a href="index.html" style="color: #e74c3c; text-decoration: none;">Перейдите в каталог</a>, чтобы добавить товары.
          </p>
        `;
        document.getElementById('order-form').style.display = 'none';
      } else {
        loadCartItems();
      }
      updateTotalCost();
    });
  });
}

function updateTotalCost() {
  if (cart.length === 0) return;
  
  // Сначала загружаем все товары, чтобы получить их цены
  getProducts({ page: 1, per_page: 100 }).then(allProducts => {
    const cartProducts = allProducts.filter(product => cart.includes(product.id));
    const subtotal = cartProducts.reduce((sum, product) => {
      return sum + (product.discount_price || product.actual_price);
    }, 0);
    
    // Рассчитываем стоимость доставки
    const deliveryDateInput = document.getElementById('delivery-date');
    const deliveryTimeSelect = document.getElementById('delivery-time');
    let deliveryCost = 0;
    
    if (deliveryDateInput && deliveryDateInput.value) {
      const deliveryDate = new Date(deliveryDateInput.value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Если дата доставки сегодня или вчера
      if (deliveryDate <= today) {
        deliveryCost = 200;
      } 
      // Если дата доставки в будущем
      else {
        const dayOfWeek = deliveryDate.getDay();
        // Выходные дни (суббота = 6, воскресенье = 0)
        if (dayOfWeek === 6 || dayOfWeek === 0) {
          deliveryCost = 300;
        } else {
          // Будние дни
          if (deliveryTimeSelect && deliveryTimeSelect.value === '18:00-22:00') {
            deliveryCost = 400; // Базовая 200 + доплата за вечер 200
          } else {
            deliveryCost = 200;
          }
        }
      }
    } else {
      deliveryCost = 200; // Базовая стоимость
    }
    
    const total = subtotal + deliveryCost;
    
    if (document.getElementById('total-cost')) {
      document.getElementById('total-cost').innerHTML = `
        <div>Товары: ${subtotal.toLocaleString()} ₽</div>
        <div>Доставка: ${deliveryCost.toLocaleString()} ₽</div>
        <div class="total-cost">Итого: ${total.toLocaleString()} ₽</div>
      `;
    }
  });
}

// ЕДИНСТВЕННАЯ функция setupOrderForm
function setupOrderForm() {
  const form = document.getElementById('order-form');
  if (!form) return;
  
  // Устанавливаем минимальную дату доставки - сегодня
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('delivery-date').min = today;
  
  // Обработка отправки формы
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (cart.length === 0) {
      showNotification('Корзина пуста', 'error');
      return;
    }
    
    // Сбор данных формы
    const name = document.getElementById('name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const address = document.getElementById('address').value.trim();
    const subscribe = document.getElementById('subscribe')?.checked || false;
    const comment = document.getElementById('comment').value.trim();
    const deliveryTime = document.getElementById('delivery-time').value;
    
    // Преобразование даты в формат dd.mm.yyyy (требуется API)
    let deliveryDate = '';
    const dateInput = document.getElementById('delivery-date').value;
    if (dateInput) {
      const date = new Date(dateInput);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      deliveryDate = `${day}.${month}.${year}`;
    }
    
    // Валидация обязательных полей
    if (!name || !email || !phone || !address || !deliveryDate || !deliveryTime) {
      showNotification('Пожалуйста, заполните все обязательные поля', 'error');
      return;
    }
    
    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showNotification('Некорректный email', 'error');
      return;
    }
    
    try {
      const orderData = {
        name,
        email,
        phone,
        subscribe,
        address,
        deliveryDate,
        deliveryTime,
        comment,
        items: [...cart]
      };
      
      await createOrder(orderData);
      
      // Очистка корзины
      cart = [];
      localStorage.removeItem('cart');
      updateCartCount();
      
      showNotification('Заказ успешно оформлен!', 'success');
      
      // Перенаправление на главную
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 2000);
    } catch (error) {
      console.error('Ошибка оформления заказа:', error);
      showNotification('Ошибка оформления заказа: ' + (error.message || 'Попробуйте позже'), 'error');
    }
  });
  
  // Расчет стоимости при изменении даты/времени доставки
  document.getElementById('delivery-date')?.addEventListener('change', updateTotalCost);
  document.getElementById('delivery-time')?.addEventListener('change', updateTotalCost);
  
  // Сброс корзины
  document.getElementById('reset-cart')?.addEventListener('click', () => {
    localStorage.removeItem('cart');
    cart = [];
    updateCartCount();
    loadCartItems();
    updateTotalCost();
    showNotification('Корзина очищена', 'info');
  });
}

// Страница заказов (личный кабинет)
async function loadUserOrders() {
  try {
    const orders = await getOrders();
    renderOrders(orders);
  } catch (error) {
    console.error('Ошибка загрузки заказов:', error);
    document.querySelector('#orders-table tbody').innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 20px; color: #e74c3c;">
          Ошибка загрузки заказов. Попробуйте обновить страницу.
        </td>
      </tr>
    `;
    showNotification('Ошибка загрузки заказов', 'error');
  }
}

function renderOrders(orders) {
  const tbody = document.querySelector('#orders-table tbody');
  tbody.innerHTML = '';
  
  if (orders.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: 40px;">
          У вас пока нет оформленных заказов
        </td>
      </tr>
    `;
    return;
  }
  
  orders.forEach((order, index) => {
    const row = document.createElement('tr');
    
    // Форматируем дату создания
    const createdDate = new Date(order.created_at);
    const formattedCreated = createdDate.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // Форматируем дату доставки
    const deliveryDate = new Date(order.delivery_date);
    const formattedDelivery = deliveryDate.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    // Формируем состав заказа
    const itemsList = order.good_ids.join(', ');
    
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${formattedCreated}</td>
      <td title="${itemsList}">${itemsList.length > 50 ? itemsList.substring(0, 50) + '...' : itemsList}</td>
      <td>${order.total_price.toLocaleString()} ₽</td>
      <td>${formattedDelivery}<br>${order.delivery_interval}</td>
      <td>
        <button class="action-btn view" data-id="${order.id}" title="Просмотреть">👁️</button>
        <button class="action-btn edit" data-id="${order.id}" title="Редактировать">✏️</button>
        <button class="action-btn delete" data-id="${order.id}" title="Удалить">🗑️</button>
      </td>
    `;
    tbody.appendChild(row);
  });
  
  // Добавляем обработчики для кнопок
  document.querySelectorAll('.view').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const orderId = parseInt(e.target.dataset.id);
      viewOrder(orderId);
    });
  });
  
  document.querySelectorAll('.edit').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const orderId = parseInt(e.target.dataset.id);
      editOrder(orderId);
    });
  });
  
  document.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const orderId = parseInt(e.target.dataset.id);
      deleteOrderConfirm(orderId);
    });
  });
}

function viewOrder(orderId) {
  getOrders().then(orders => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    // Форматируем данные для отображения
    const createdDate = new Date(order.created_at).toLocaleString('ru-RU');
    const deliveryDate = new Date(order.delivery_date).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    const details = document.getElementById('view-order-details');
    details.innerHTML = `
      <p><strong>Дата оформления:</strong> ${createdDate}</p>
      <p><strong>Имя:</strong> ${order.full_name}</p>
      <p><strong>Email:</strong> ${order.email}</p>
      <p><strong>Телефон:</strong> ${order.phone}</p>
      <p><strong>Подписка на рассылку:</strong> ${order.subscribe ? 'Да' : 'Нет'}</p>
      <p><strong>Адрес доставки:</strong> ${order.delivery_address}</p>
      <p><strong>Дата доставки:</strong> ${deliveryDate}</p>
      <p><strong>Время доставки:</strong> ${order.delivery_interval}</p>
      <p><strong>Состав заказа:</strong> ${order.good_ids.join(', ')}</p>
      <p><strong>Стоимость:</strong> ${order.total_price.toLocaleString()} ₽</p>
      <p><strong>Комментарий:</strong> ${order.comment || 'Не указан'}</p>
    `;
    
    document.getElementById('view-order-modal').style.display = 'block';
  }).catch(error => {
    console.error('Ошибка получения деталей заказа:', error);
    showNotification('Ошибка получения деталей заказа', 'error');
  });
}

function editOrder(orderId) {
  getOrders().then(orders => {
    const order = orders.find(o => o.id === orderId);
    if (!order) return;
    
    // Заполняем форму редактирования
    document.getElementById('edit-order-id').value = order.id;
    document.getElementById('edit-order-name').value = order.full_name;
    document.getElementById('edit-order-email').value = order.email;
    document.getElementById('edit-order-phone').value = order.phone;
    document.getElementById('edit-order-subscribe').checked = order.subscribe;
    document.getElementById('edit-order-address').value = order.delivery_address;
    document.getElementById('edit-order-delivery-date').value = order.delivery_date;
    document.getElementById('edit-order-delivery-time').value = order.delivery_interval;
    document.getElementById('edit-order-comment').value = order.comment || '';
    
    document.getElementById('edit-order-modal').style.display = 'block';
  }).catch(error => {
    console.error('Ошибка получения данных для редактирования:', error);
    showNotification('Ошибка получения данных заказа', 'error');
  });
}

function deleteOrderConfirm(orderId) {
  document.getElementById('delete-order-modal').dataset.orderId = orderId;
  document.getElementById('delete-order-modal').style.display = 'block';
}

function setupOrderActions() {
  // Редактирование заказа
  const editForm = document.getElementById('edit-order-form');
  if (editForm) {
    editForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const orderId = parseInt(document.getElementById('edit-order-id').value);
      const orderData = {
        name: document.getElementById('edit-order-name').value.trim(),
        email: document.getElementById('edit-order-email').value.trim(),
        phone: document.getElementById('edit-order-phone').value.trim(),
        subscribe: document.getElementById('edit-order-subscribe').checked,
        address: document.getElementById('edit-order-address').value.trim(),
        deliveryDate: document.getElementById('edit-order-delivery-date').value,
        deliveryTime: document.getElementById('edit-order-delivery-time').value,
        comment: document.getElementById('edit-order-comment').value.trim()
      };
      
      // Валидация
      if (!orderData.name || !orderData.email || !orderData.phone || !orderData.address || 
          !orderData.deliveryDate || !orderData.deliveryTime) {
        showNotification('Пожалуйста, заполните все обязательные поля', 'error');
        return;
      }
      
      try {
        await updateOrder(orderId, orderData);
        showNotification('Заказ успешно обновлен', 'success');
        closeAllModals();
        loadUserOrders();
      } catch (error) {
        console.error('Ошибка обновления заказа:', error);
        showNotification('Ошибка обновления заказа: ' + (error.message || 'Попробуйте позже'), 'error');
      }
    });
  }
}

// Вспомогательные функции
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Экспортируем функции для использования в других модулях
window.updateCartCount = updateCartCount;
window.showNotification = showNotification;
