const API_KEY = '0ef845ea-3f76-4af2-9e70-1af33830ec6d';

function getApiUrl(endpoint) {
  return `https://edu.std-900.ist.mospolytech.ru${endpoint}?api_key=${API_KEY}`;
}

export async function getProducts(params = {}) {
  try {
    const { page = 1, per_page = 12, query = '', sort_order = 'rating_desc' } = params;

    const url = new URL(getApiUrl('/exam-2024-1/api/goods'));
    url.searchParams.append('page', page);
    url.searchParams.append('per_page', per_page);
    if (query) url.searchParams.append('query', query);
    
    const sortMapping = {
      'rating-asc': 'rating_asc',
      'rating-desc': 'rating_desc',
      'price-asc': 'price_asc',
      'price-desc': 'price_desc'
    };
    url.searchParams.append('sort_order', sortMapping[sort_order] || 'rating_desc');

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const result = await response.json();
    return {
      goods: Array.isArray(result.goods) ? result.goods : [],
      pagination: result._pagination || { current_page: page, per_page, total_count: 0 }
    };
  } catch (error) {
    console.error('Ошибка при получении товаров:', error);
    return { goods: [], pagination: { current_page: 1, per_page: 12, total_count: 0 } };
  }
}

// Остальные функции без изменений
export async function getOrders() {
  try {
    const url = getApiUrl('/exam-2024-1/api/orders');
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
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
      throw new Error(errorText || `HTTP ${response.status}`);
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
      throw new Error(errorText || `HTTP ${response.status}`);
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
      throw new Error(errorText || `HTTP ${response.status}`);
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
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Ошибка при получении подсказок:', error);
    return [];
  }
}
