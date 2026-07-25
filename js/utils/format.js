// Format utilities - Global namespace
window.APP_Format = {
  money(amount) {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  },

  date(date) {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric'
    }).format(new Date(date));
  },

  shortDate(date) {
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric', month: 'short'
    }).format(new Date(date));
  },

  monthName(date) {
    return new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(new Date(date));
  },

  monthYear(date) {
    return new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(new Date(date));
  }
};
