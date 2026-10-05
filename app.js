// State and DOM elements declaration boundaries
let workspaceState = { records: [] };

const formNode = document.getElementById('invoiceForm');
const containerBody = document.getElementById('invoiceTableBodyContainer');
const displayTotalInvoiced = document.getElementById('totalInvoicedDisplay');
const displayRevenueCollected = document.getElementById('revenueCollectedDisplay');
const displayOutstandingUdhaar = document.getElementById('outstandingUdhaarDisplay');
const displayEstimatedTotal = document.getElementById('estimatedTotalDisplay');

const inQty = document.getElementById('quantityInput');
const inPrice = document.getElementById('unitPriceInput');
const inSearch = document.getElementById('searchInputField');
const inFilter = document.getElementById('filterSelectField');

// Initialize runtime lifecycle hooks
window.addEventListener('load', () => {
    const dataString = localStorage.getItem('invoiceflow_final_storage_key');
    if (dataString) {
        try {
            workspaceState.records = JSON.parse(dataString);
        } catch(e) {
            workspaceState.records = [];
        }
    }
    
    // Core submission execution loop
    formNode.addEventListener('submit', (e) => {
        e.preventDefault();
        const client = document.getElementById('customerNameInput').value.trim();
        const description = document.getElementById('itemNameInput').value.trim();
        const q = parseInt(inQty.value, 10);
        const p = parseFloat(inPrice.value);
        const statusValue = document.getElementById('paymentStatusInput').value;

        const rowSum = q * p;
        const nextId = workspaceState.records.length > 0 ? Math.max(...workspaceState.records.map(r => r.id)) + 1 : 1001;

        workspaceState.records.push({
            id: nextId,
            customer: client,
            item: description,
            qty: q,
            price: p,
            total: rowSum,
            status: statusValue
        });

        localStorage.setItem('invoiceflow_final_storage_key', JSON.stringify(workspaceState.records));
        formNode.reset();
        displayEstimatedTotal.innerText = '₹0.00';
        renderDashboard();
    });

    inQty.addEventListener('input', updateLivePreviewMath);
    inPrice.addEventListener('input', updateLivePreviewMath);
    inSearch.addEventListener('input', renderDashboard);
    inFilter.addEventListener('change', renderDashboard);

    renderDashboard();
});

// Live estimate calculation multipliers
function updateLivePreviewMath() {
    const q = parseInt(inQty.value, 10);
    const p = parseFloat(inPrice.value);
    if (!isNaN(q) && !isNaN(p) && q > 0 && p > 0) {
        displayEstimatedTotal.innerText = `₹${(q * p).toFixed(2)}`;
    } else {
        displayEstimatedTotal.innerText = '₹0.00';
    }
}

// Render dynamic tables and statistical counters
function renderDashboard() {
    let totalInvoicedSum = 0;
    let totalRevenueSum = 0;
    let totalUdhaarSum = 0;

    workspaceState.records.forEach(r => {
        totalInvoicedSum += r.total;
        if (r.status === 'PAID') {
            totalRevenueSum += r.total;
        } else {
            totalUdhaarSum += r.total;
        }
    });

    displayTotalInvoiced.innerText = `₹${totalInvoicedSum.toFixed(2)}`;
    displayRevenueCollected.innerText = `₹${totalRevenueSum.toFixed(2)}`;
    displayOutstandingUdhaar.innerText = `₹${totalUdhaarSum.toFixed(2)}`;

    const queryText = inSearch.value.toLowerCase().trim();
    const chosenFilter = inFilter.value;

    let filteredList = workspaceState.records.filter(r => {
        const textMatch = r.customer.toLowerCase().includes(queryText);
        let filterMatch = true;
        if (chosenFilter === 'PAID') filterMatch = (r.status === 'PAID');
        if (chosenFilter === 'PENDING') filterMatch = (r.status === 'PENDING');
        return textMatch && filterMatch;
    });

    containerBody.innerHTML = '';
    if (filteredList.length === 0) {
        containerBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:20px;">No invoices logged in this matrix workspace view.</td></tr>`;
        return;
    }

    filteredList.forEach(r => {
        const tr = document.createElement('tr');
        const badgeClass = r.status === 'PAID' ? 'badge paid' : 'badge pending';
        const statusLabelText = r.status === 'PAID' ? 'PAID (Clear)' : 'PENDING (Udhaar)';

        let actHTML = '--';
        if (r.status === 'PENDING') {
            actHTML = `<button class="btn-table-action" onclick="settleInvoiceRecordDirectly(${r.id})">Mark Paid</button>`;
        }

        tr.innerHTML = `
            <td><strong>INV-${r.id}</strong></td>
            <td>${r.customer}</td>
            <td><small style="color:var(--text-muted);">${r.item} (x${r.qty})</small></td>
            <td><strong>₹${r.total.toFixed(2)}</strong></td>
            <td><span class="${badgeClass}">${statusLabelText}</span></td>
            <td>${actHTML}</td>
        `;
        containerBody.appendChild(tr);
    });
}

// Status transition mutator engine (Mark Paid action click handler)
window.settleInvoiceRecordDirectly = function(targetId) {
    const matchIndex = workspaceState.records.findIndex(r => r.id === targetId);
    if (matchIndex !== -1) {
        workspaceState.records[matchIndex].status = 'PAID';
        localStorage.setItem('invoiceflow_final_storage_key', JSON.stringify(workspaceState.records));
        renderDashboard();
    }
}
