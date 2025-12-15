module.exports = {
  // Dish Status
  DISH_STATUS: {
    READY: 'Ready',
    PROCESSING: 'Processing',
    FAILED: 'Failed',
    OUT_OF_STOCK: 'Out of Stock'
  },

  // Difficulty Levels
  DIFFICULTY: {
    EASY: 'Easy',
    MEDIUM: 'Medium',
    HARD: 'Hard'
  },

  // User Roles
  USER_ROLES: {
    ADMIN: 'admin',
    MANAGER: 'manager',
    STAFF: 'staff',
    CUSTOMER: 'customer'
  },

  // Order Status
  ORDER_STATUS: {
    PENDING: 'Pending',
    CONFIRMED: 'Confirmed',
    PREPARING: 'Preparing',
    READY: 'Ready',
    DELIVERED: 'Delivered',
    CANCELLED: 'Cancelled'
  },

  // Payment Status
  PAYMENT_STATUS: {
    PENDING: 'Pending',
    COMPLETED: 'Completed',
    FAILED: 'Failed',
    REFUNDED: 'Refunded'
  },

  // Categories
  CATEGORIES: {
    APPETIZERS: 'Appetizers',
    MAIN_COURSES: 'Main Courses',
    DESSERTS: 'Desserts',
    BEVERAGES: 'Beverages',
    SIDES: 'Sides'
  },

  // Allergens
  ALLERGENS: [
    'Gluten',
    'Dairy',
    'Eggs',
    'Fish',
    'Shellfish',
    'Nuts',
    'Peanuts',
    'Soy',
    'Sesame'
  ],

  // HTTP Status Codes
  HTTP_STATUS: {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    INTERNAL_SERVER_ERROR: 500
  }
};