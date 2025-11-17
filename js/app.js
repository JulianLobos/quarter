document.addEventListener('DOMContentLoaded', () => {

    // State
    let state = {
        transactions: [],
        categories: [],
        currentDate: new Date(),
        transactionToEdit: null,
    };

    // DOM Elements
    const balanceAmountEl = document.getElementById('balance-amount');
    const dailyBudgetEl = document.getElementById('daily-budget-amount');
    const currentMonthYearEl = document.getElementById('current-month-year');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const transactionsListEl = document.getElementById('transactions-list');
    const addTransactionBtn = document.getElementById('add-transaction-btn');

    // Modals
    const transactionModal = document.getElementById('transaction-modal');
    const transactionForm = document.getElementById('transaction-form');
    const transactionModalTitle = document.getElementById('transaction-modal-title');
    const cancelTransactionBtn = document.getElementById('cancel-transaction-btn');

    const categoriesModal = document.getElementById('categories-modal');
    const manageCategoriesBtn = document.getElementById('manage-categories-btn');
    const closeCategoriesModalBtn = document.getElementById('close-categories-modal-btn');
    const categoriesListEl = document.getElementById('categories-list');
    const categoryForm = document.getElementById('category-form');
    const categoryNameInput = document.getElementById('category-name');
    const categoryIdInput = document.getElementById('category-id');
    const saveCategoryBtn = document.getElementById('save-category-btn');

    const importExportModal = document.getElementById('import-export-modal');
    const importExportBtn = document.getElementById('import-export-btn');
    const closeImportExportModalBtn = document.getElementById('close-import-export-modal-btn');
    const exportDataBtn = document.getElementById('export-data-btn');
    const importFileInput = document.getElementById('import-file-input');

    // Chart instances
    let dailyFlowChart;
    let categoryExpensesChart;

    // LOCAL STORAGE HELPERS
    const STORAGE_KEYS = {
        transactions: 'quarter_transactions',
        categories: 'quarter_categories',
    };

    const saveData = (key, data) => {
        localStorage.setItem(key, JSON.stringify(data));
    };

    const loadData = (key) => {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    };

    // INITIALIZATION
    const init = () => {
        loadInitialData();
        addEventListeners();
        render();
    };

    const loadInitialData = () => {
        const transactions = loadData(STORAGE_KEYS.transactions) || [];
        state.transactions = transactions.map(t => ({ ...t, date: new Date(t.date) }));

        let categories = loadData(STORAGE_KEYS.categories);
        if (!categories || categories.length === 0) {
            categories = [
                { id: Date.now() + 1, name: 'Comida' },
                { id: Date.now() + 2, name: 'Transporte' },
                { id: Date.now() + 3, name: 'Alojamiento' },
                { id: Date.now() + 4, name: 'Ocio' },
                { id: Date.now() + 5, name: 'Salud' },
                { id: Date.now() + 6, name: 'Sueldo' },
            ];
            saveData(STORAGE_KEYS.categories, categories);
        }
        state.categories = categories;
    };

    // RENDER FUNCTIONS
    const render = () => {
        renderDate();
        renderSummary();
        renderTransactions();
        renderCharts();
    };

    const renderDate = () => {
        currentMonthYearEl.textContent = state.currentDate.toLocaleDateString('es-ES', {
            month: 'long',
            year: 'numeric'
        });
    };

    const renderSummary = () => {
        const transactionsForMonth = getTransactionsForCurrentMonth();
        const balance = transactionsForMonth.reduce((acc, t) => {
            return t.type === 'income' ? acc + t.amount : acc - t.amount;
        }, 0);
        balanceAmountEl.textContent = formatCurrency(balance);

        const today = new Date();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const remainingDays = state.currentDate.getMonth() === today.getMonth() ? daysInMonth - today.getDate() + 1 : 0;
        
        const dailyBudget = remainingDays > 0 ? balance / remainingDays : 0;
        dailyBudgetEl.textContent = formatCurrency(dailyBudget > 0 ? dailyBudget : 0);
    };

    const renderTransactions = () => {
        transactionsListEl.innerHTML = '';
        const transactionsForMonth = getTransactionsForCurrentMonth();

        if (transactionsForMonth.length === 0) {
            transactionsListEl.innerHTML = '<li><p>No hay transacciones este mes.</p></li>';
            return;
        }

        transactionsForMonth
            .sort((a, b) => b.date - a.date)
            .forEach(t => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <div class="transaction-item-details">
                        <p>${getCategoryName(t.category)}</p>
                        <span>${t.date.toLocaleDateString('es-ES')} - ${t.details || ''}</span>
                    </div>
                    <div class="transaction-item-amount ${t.type}">
                        ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                    </div>
                `;
                li.addEventListener('click', () => openTransactionModal(t));
                transactionsListEl.appendChild(li);
            });
    };

    const renderCharts = () => {
        renderDailyFlowChart();
        renderCategoryExpensesChart();
    };

    const renderDailyFlowChart = () => {
        const transactionsForMonth = getTransactionsForCurrentMonth();
        const daysInMonth = new Date(state.currentDate.getFullYear(), state.currentDate.getMonth() + 1, 0).getDate();
        const labels = Array.from({ length: daysInMonth }, (_, i) => i + 1);

        const dailyData = labels.reduce((acc, day) => {
            acc[day] = { income: 0, expense: 0 };
            return acc;
        }, {});

        transactionsForMonth.forEach(t => {
            const day = t.date.getDate();
            if (t.type === 'income') {
                dailyData[day].income += t.amount;
            } else {
                dailyData[day].expense += t.amount;
            }
        });

        const incomeData = labels.map(day => dailyData[day].income);
        const expenseData = labels.map(day => dailyData[day].expense);

        const data = {
            labels,
            datasets: [
                {
                    label: 'Ingresos',
                    data: incomeData,
                    backgroundColor: 'rgba(52, 199, 89, 0.5)',
                    borderColor: 'rgba(52, 199, 89, 1)',
                    borderWidth: 1,
                    fill: true,
                },
                {
                    label: 'Gastos',
                    data: expenseData,
                    backgroundColor: 'rgba(255, 59, 48, 0.5)',
                    borderColor: 'rgba(255, 59, 48, 1)',
                    borderWidth: 1,
                    fill: true,
                }
            ]
        };

        if (dailyFlowChart) dailyFlowChart.destroy();
        dailyFlowChart = new Chart(document.getElementById('daily-flow-chart'), {
            type: 'line',
            data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'Flujo diario del mes' }
                },
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    };

    const renderCategoryExpensesChart = () => {
        const expenseTransactions = getTransactionsForCurrentMonth().filter(t => t.type === 'expense');
        const categoryData = expenseTransactions.reduce((acc, t) => {
            const categoryName = getCategoryName(t.category);
            acc[categoryName] = (acc[categoryName] || 0) + t.amount;
            return acc;
        }, {});

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);

        const chartData = {
            labels,
            datasets: [{
                label: 'Gastos por Categoría',
                data,
                backgroundColor: [
                    '#ff9f40', '#ff6384', '#36a2eb', '#cc65fe', '#ffcd56',
                    '#4bc0c0', '#f7786b', '#a3a0fb', '#e8c3b9', '#5e72e4'
                ],
            }]
        };

        if (categoryExpensesChart) categoryExpensesChart.destroy();
        categoryExpensesChart = new Chart(document.getElementById('category-expenses-chart'), {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: true, text: 'Gastos por categoría' }
                }
            }
        });
    };

    const renderCategories = () => {
        categoriesListEl.innerHTML = '';
        state.categories.forEach(cat => {
            const item = document.createElement('div');
            item.className = 'category-item';
            item.innerHTML = `
                <span>${cat.name}</span>
                <div>
                    <button class="edit-cat-btn" data-id="${cat.id}">✏️</button>
                    <button class="delete-cat-btn" data-id="${cat.id}">🗑️</button>
                </div>
            `;
            categoriesListEl.appendChild(item);
        });
    };

    // EVENT LISTENERS
    const addEventListeners = () => {
        prevMonthBtn.addEventListener('click', changeMonth(-1));
        nextMonthBtn.addEventListener('click', changeMonth(1));
        addTransactionBtn.addEventListener('click', () => openTransactionModal());
        cancelTransactionBtn.addEventListener('click', closeTransactionModal);
        transactionForm.addEventListener('submit', handleTransactionFormSubmit);
        manageCategoriesBtn.addEventListener('click', openCategoriesModal);
        closeCategoriesModalBtn.addEventListener('click', closeCategoriesModal);
        categoryForm.addEventListener('submit', handleCategoryFormSubmit);
        categoriesListEl.addEventListener('click', handleCategoryActions);
        importExportBtn.addEventListener('click', openImportExportModal);
        closeImportExportModalBtn.addEventListener('click', closeImportExportModal);
        exportDataBtn.addEventListener('click', exportData);
        importFileInput.addEventListener('change', importData);
    };

    // MODAL HANDLERS
    const openTransactionModal = (transaction = null) => {
        transactionForm.reset();
        state.transactionToEdit = transaction;
        populateCategoriesDropdown();

        if (transaction) {
            transactionModalTitle.textContent = 'Editar Transacción';
            document.getElementById('transaction-id').value = transaction.id;
            document.getElementById('transaction-type').value = transaction.type;
            document.getElementById('transaction-amount').value = transaction.amount;
            document.getElementById('transaction-category').value = transaction.category;
            document.getElementById('transaction-date').value = transaction.date.toISOString().split('T')[0];
            document.getElementById('transaction-payment-method').value = transaction.paymentMethod;
            document.getElementById('transaction-details').value = transaction.details;
        } else {
            transactionModalTitle.textContent = 'Nueva Transacción';
            document.getElementById('transaction-date').value = new Date().toISOString().split('T')[0];
        }
        transactionModal.style.display = 'flex';
    };

    const closeTransactionModal = () => {
        transactionModal.style.display = 'none';
        state.transactionToEdit = null;
    };

    const openCategoriesModal = () => {
        renderCategories();
        categoriesModal.style.display = 'flex';
    };

    const closeCategoriesModal = () => {
        categoriesModal.style.display = 'none';
        resetCategoryForm();
    };

    const openImportExportModal = () => {
        importExportModal.style.display = 'flex';
    };

    const closeImportExportModal = () => {
        importExportModal.style.display = 'none';
    };

    // FORM HANDLERS
    const handleTransactionFormSubmit = (e) => {
        e.preventDefault();
        const id = state.transactionToEdit ? state.transactionToEdit.id : Date.now();
        const newTransaction = {
            id,
            type: document.getElementById('transaction-type').value,
            amount: parseFloat(document.getElementById('transaction-amount').value),
            category: parseInt(document.getElementById('transaction-category').value),
            date: new Date(document.getElementById('transaction-date').value + 'T00:00:00'), // Avoid timezone issues
            paymentMethod: document.getElementById('transaction-payment-method').value,
            details: document.getElementById('transaction-details').value,
        };

        if (state.transactionToEdit) {
            state.transactions = state.transactions.map(t => t.id === id ? newTransaction : t);
        } else {
            state.transactions.push(newTransaction);
        }

        saveData(STORAGE_KEYS.transactions, state.transactions);
        render();
        closeTransactionModal();
    };


    const handleCategoryFormSubmit = (e) => {
        e.preventDefault();
        const name = categoryNameInput.value.trim();
        const id = categoryIdInput.value ? parseInt(categoryIdInput.value) : null;

        if (!name) return;

        if (id) { // Editing
            const category = state.categories.find(c => c.id === id);
            if (category) category.name = name;
        } else { // Adding
            if (state.categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
                alert('La categoría ya existe.');
                return;
            }
            state.categories.push({ id: Date.now(), name });
        }

        saveData(STORAGE_KEYS.categories, state.categories);
        renderCategories();
        resetCategoryForm();
    };

    const handleCategoryActions = (e) => {
        const target = e.target;
        const id = parseInt(target.dataset.id);

        if (target.classList.contains('edit-cat-btn')) {
            const category = state.categories.find(c => c.id === id);
            if (category) {
                categoryIdInput.value = category.id;
                categoryNameInput.value = category.name;
                saveCategoryBtn.textContent = 'Guardar';
                categoryNameInput.focus();
            }
        }

        if (target.classList.contains('delete-cat-btn')) {
            const isUsed = state.transactions.some(t => t.category === id);
            if (isUsed) {
                alert('No se puede eliminar una categoría que está en uso.');
                return;
            }
            if (confirm('¿Estás seguro de que quieres eliminar esta categoría?')) {
                state.categories = state.categories.filter(c => c.id !== id);
                saveData(STORAGE_KEYS.categories, state.categories);
                renderCategories();
            }
        }
    };

    // DATA & STATE MANIPULATION
    const changeMonth = (direction) => () => {
        state.currentDate.setMonth(state.currentDate.getMonth() + direction);
        render();
    };

    const getTransactionsForCurrentMonth = () => {
        return state.transactions.filter(t =>
            t.date.getFullYear() === state.currentDate.getFullYear() &&
            t.date.getMonth() === state.currentDate.getMonth()
        );
    };

    const populateCategoriesDropdown = () => {
        const select = document.getElementById('transaction-category');
        select.innerHTML = '';
        state.categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat.id;
            option.textContent = cat.name;
            select.appendChild(option);
        });
    };

    const resetCategoryForm = () => {
        categoryForm.reset();
        categoryIdInput.value = '';
        saveCategoryBtn.textContent = 'Añadir';
    };

    // IMPORT / EXPORT
    const exportData = () => {
        const data = {
            transactions: state.transactions,
            categories: state.categories,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quarter_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        closeImportExportModal();
    };

    const importData = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (data.transactions && data.categories) {
                    if (confirm('Esto reemplazará todos tus datos actuales. ¿Continuar?')) {
                        state.transactions = data.transactions.map(t => ({ ...t, date: new Date(t.date) }));
                        state.categories = data.categories;
                        saveData(STORAGE_KEYS.transactions, state.transactions);
                        saveData(STORAGE_KEYS.categories, state.categories);
                        render();
                        alert('Datos importados con éxito.');
                    }
                } else {
                    alert('Archivo JSON no válido.');
                }
            } catch (error) {
                alert('Error al leer el archivo.');
                console.error(error);
            } finally {
                importFileInput.value = ''; // Reset file input
                closeImportExportModal();
            }
        };
        reader.readAsText(file);
    };

    // HELPERS
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(amount);
    };

    const getCategoryName = (id) => {
        const category = state.categories.find(c => c.id === id);
        return category ? category.name : 'Sin Categoría';
    };

    // Start the app
    init();
});
