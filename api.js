// api.js — ФИНАЛЬНАЯ РАБОЧАЯ ВЕРСИЯ
const API_KEY = '0ef845ea-3f76-4af2-9e70-1af33830ec6d';

function getApiUrl(endpoint) {
  return `https://edu.std-900.ist.mospolytech.ru${endpoint}?api_key=${API_KEY}`;
}

/**
 * Получить список товаров
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

    // Формируем URL с параметрами
    const url = new URL(getApiUrl('/exam-2024-1/api/goods'));
    url.searchParams.append('page', page);
    url.searchParams.append('per_page', per_page);
    if (query) url.searchParams.append('query', query);

    const response = await fetch(url.toString());
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    // API возвращает объект { goods: [...], _pagination: {...} }
    const result = await response.json();
    const products = Array.isArray(result.goods) ? result.goods : [];

    // Фильтрация по категориям
    let filtered = products;
    if (categories.length > 0) {
      filtered = filtered.filter(product =>
        product.main_category && 
        categories.includes(product.main_category.toLowerCase())
      );
    }

    // Фильтрация по цене
    filtered = filtered.filter(product => {
      const price = product.discount_price ?? product.actual_price;
      return price >= min_price && price <= max_price;
    });

    // Фильтрация товаров со скидкой
    if (discount_only) {
      filtered = filtered.filter(product =>
        product.discount_price != null && 
        product.discount_price < product.actual_price
      );
    }

    // Сортировка
    filtered.sort((a, b) => {
      const aPrice = a.discount_price ?? a.actual_price;
      const bPrice = b.discount_price ?? b.actual_price;
      const aRating = a.rating ?? 0;
      const bRating = b.rating ?? 0;

      switch (sort) {
        case 'price-asc': return aPrice - bPrice;
        case 'price-desc': return bPrice - aPrice;
        case 'rating-asc': return aRating - bRating;
        case 'rating-desc': return bRating - aRating;
        default: return bRating - aRating;
      }
    });

    return filtered;
  } catch (error) {
    console.error('Ошибка при получении товаров:', error);
    return [];
  }
}

// Остальные функции остаются без изменений
export async function getOrders() {
  try {
    const url = getApiUrl('/exam-2024-1/api/orders');
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    const result = await response.json();
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('Ошибка при получении заказов:', error);
    return [];
  }
}

export async function createOrder(orderData) {
  try {
    const url = getApiUrl('/exam-2024-1/api/orders');
    const preparedData = {
      full_name: orderData.name,
      email: orderData.email,
      phone: orderData.phone,
      subscribe: orderData.subscribe || false,
      delivery_address: orderData.address,
      delivery_date: orderData.deliveryDate,
      delivery_interval: orderData.deliveryTime,
      comment: orderData.comment || '',
      good_ids: orderData.items
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preparedData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка при создании заказа:', error);
    throw error;
  }
}

export async function updateOrder(orderId, orderData) {
  try {
    const url = getApiUrl(`/exam-2024-1/api/orders/${orderId}`);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preparedData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка при обновлении заказа:', error);
    throw error;
  }
}

export async function deleteOrder(orderId) {
  try {
    const url = getApiUrl(`/exam-2024-1/api/orders/${orderId}`);
    const response = await fetch(url, { method: 'DELETE' });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка при удалении заказа:', error);
    throw error;
  }
}

export async function getAutocompleteSuggestions(query) {
  try {
    if (!query || query.length < 2) return [];
    
    const url = new URL(getApiUrl('/exam-2024-1/api/autocomplete'));
    url.searchParams.append('query', query);
    
    const response = await fetch(url.toString());
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Ошибка при получении подсказок:', error);
    return [];
  }
}
