// Базовый URL API
const API_URL = 'https://api.example.com'; // Замените на реальный URL

/**
 * Получить список товаров
 * @returns {Promise<Array>}
 */
export async function getProducts() {
  try {
    const response = await fetch(`${API_URL}/products`);
    if (!response.ok) throw new Error('Ошибка загрузки товаров');
    return await response.json();
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
    const response = await fetch(`${API_URL}/orders`);
    if (!response.ok) throw new Error('Ошибка загрузки заказов');
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
    const response = await fetch(`${API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });
    if (!response.ok) throw new Error('Ошибка оформления заказа');
    return await response.json();
  } catch (error) {
    console.error('Ошибка при создании заказа:', error);
    throw error;
  }
}

/**
 * Обновить заказ
 * @param {string} orderId
 * @param {Object} orderData
 * @returns {Promise<Object>}
 */
export async function updateOrder(orderId, orderData) {
  try {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });
    if (!response.ok) throw new Error('Ошибка обновления заказа');
    return await response.json();
  } catch (error) {
    console.error('Ошибка при обновлении заказа:', error);
    throw error;
  }
}

/**
 * Удалить заказ
 * @param {string} orderId
 * @returns {Promise<Object>}
 */
export async function deleteOrder(orderId) {
  try {
    const response = await fetch(`${API_URL}/orders/${orderId}`, {
      method: 'DELETE'
    });
    if (!response.ok) throw new Error('Ошибка удаления заказа');
    return await response.json();
  } catch (error) {
    console.error('Ошибка при удалении заказа:', error);
    throw error;
  }
}
