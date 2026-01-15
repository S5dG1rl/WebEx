// Конфигурация API
const BASE_URL = 'https://edu.std-900.ist.mospolytech.ru';
const API_KEY = '0ef845ea-3f76-4af2-9e70-1af33830ec6d';

/**
 * Формирует URL с API-ключом
 * @param {string} endpoint - Эндпоинт API
 * @returns {string} Полный URL с API-ключом
 */
function getApiUrl(endpoint) {
  return `${BASE_URL}${endpoint}?api_key=${API_KEY}`;
}

/**
 * Получить список товаров
 * @param {Object} params - Параметры запроса
 * @param {number} [params.page=1] - Номер страницы
 * @param {number} [params.per_page=20] - Товаров на страницу
 * @param {string} [params.query=''] - Поисковый запрос
 * @param {string[]} [params.categories=[]] - Категории товаров
 * @param {number} [params.min_price=0] - Минимальная цена
 * @param {number} [params.max_price=10000] - Максимальная цена
 * @param {boolean} [params.discount_only=false] - Только со скидкой
 * @param {string} [params.sort='rating-desc'] - Сортировка
 * @returns {Promise<Array>}
 */
export async function getProducts(params = {}) {
  try {
    const {
      page = 1,
      per_page = 20,
      query = '',
      categories = [],
      min_price = 0,
      max_price = 10000,
      discount_only = false,
      sort = 'rating-desc'
    } = params;

    const url = new URL(getApiUrl('/exam-2024-1/api/goods'));
    
    // Параметры пагинации и поиска
    url.searchParams.append('page', page);
    url.searchParams.append('per_page', per_page);
    if (query) url.searchParams.append('query', query);
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Ошибка загрузки товаров');
    }
    
    let products = await response.json();
    
    // Фильтрация по категориям
    if (categories.length > 0) {
      products = products.filter(product => 
        categories.includes(product.main_category.toLowerCase())
      );
    }
    
    // Фильтрация по цене
    products = products.filter(product => {
      const price = product.discount_price || product.actual_price;
      return price >= min_price && price <= max_price;
    });
    
    // Фильтрация товаров со скидкой
    if (discount_only) {
      products = products.filter(product => 
        product.discount_price && product.discount_price < product.actual_price
      );
    }
    
    // Сортировка
    products.sort((a, b) => {
      const aPrice = a.discount_price || a.actual_price;
      const bPrice = b.discount_price || b.actual_price;
      const aRating = a.rating || 0;
      const bRating = b.rating || 0;
      
      switch (sort) {
        case 'price-asc': return aPrice - bPrice;
        case 'price-desc': return bPrice - aPrice;
        case 'rating-asc': return aRating - bRating;
        case 'rating-desc': return bRating - aRating;
        default: return bRating - aRating;
      }
    });
    
    return products;
  } catch (error) {
    console.error('Ошибка при получении товаров:', error);
    return [];
  }
}

/**
 * Получить список заказов
 * @returns {Promise<Array>}
 */
export async function getOrders() {
  try {
    const url = getApiUrl('/exam-2024-1/api/orders');
    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Ошибка загрузки заказов');
    }
    return await response.json();
  } catch (error) {
    console.error('Ошибка при получении заказов:', error);
    return [];
  }
}

/**
 * Создать новый заказ
 * @param {Object} orderData
 * @returns {Promise<Object>}
 */
export async function createOrder(orderData) {
  try {
    const url = getApiUrl('/exam-2024-1/api/orders');
    
    // Подготавливаем данные заказа в соответствии с API
    const preparedData = {
      full_name: orderData.name,
      email: orderData.email,
      phone: orderData.phone,
      subscribe: orderData.subscribe || false,
      delivery_address: orderData.address,
      delivery_date: orderData.deliveryDate, // API принимает YYYY-MM-DD
      delivery_interval: orderData.deliveryTime,
      comment: orderData.comment || '',
      good_ids: orderData.items
    };
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preparedData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Ошибка оформления заказа');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Ошибка при создании заказа:', error);
    throw error;
  }
}

/**
 * Обновить заказ
 * @param {number} orderId
 * @param {Object} orderData
 * @returns {Promise<Object>}
 */
export async function updateOrder(orderId, orderData) {
  try {
    const url = getApiUrl(`/exam-2024-1/api/orders/${orderId}`);
    
    // Подготавливаем данные для обновления
    const preparedData = {};
    
    if (orderData.name !== undefined) preparedData.full_name = orderData.name;
    if (orderData.email !== undefined) preparedData.email = orderData.email;
    if (orderData.phone !== undefined) preparedData.phone = orderData.phone;
    if (orderData.address !== undefined) preparedData.delivery_address = orderData.address;
    if (orderData.deliveryDate !== undefined) preparedData.delivery_date = orderData.deliveryDate;
    if (orderData.deliveryTime !== undefined) preparedData.delivery_interval = orderData.deliveryTime;
    if (orderData.comment !== undefined) preparedData.comment = orderData.comment;
    if (orderData.subscribe !== undefined) preparedData.subscribe = orderData.subscribe;
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(preparedData)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Ошибка обновления заказа');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Ошибка при обновлении заказа:', error);
    throw error;
  }
}

/**
 * Удалить заказ
 * @param {number} orderId
 * @returns {Promise<Object>}
 */
export async function deleteOrder(orderId) {
  try {
    const url = getApiUrl(`/exam-2024-1/api/orders/${orderId}`);
    
    const response = await fetch(url, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Ошибка удаления заказа');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Ошибка при удалении заказа:', error);
    throw error;
  }
}

/**
 * Получить варианты автодополнения для поиска
 * @param {string} query - Поисковый запрос
 * @returns {Promise<Array>}
 */
export async function getAutocompleteSuggestions(query) {
  try {
    if (!query || query.length < 2) return [];
    
    const url = new URL(getApiUrl('/exam-2024-1/api/autocomplete'));
    url.searchParams.append('query', query);
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Ошибка получения подсказок');
    }
    return await response.json();
  } catch (error) {
    console.error('Ошибка при получении подсказок:', error);
    return [];
  }
}
