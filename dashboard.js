import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  runTransaction,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);

const status = document.getElementById("status");
const orderCount = document.getElementById("orderCount");
const manualCount = document.getElementById("manualCount");
const lastOrder = document.getElementById("lastOrder");

const manualOrderForm = document.getElementById("manualOrderForm");
const formMessage = document.getElementById("formMessage");
const ordersList = document.getElementById("ordersList");
const orderHistoryList = document.getElementById("orderHistoryList");
const logoutButton = document.getElementById("logout");

let currentUser = null;
let allOrders = [];


/* -----------------------------
   AUTHENTICATION
----------------------------- */

onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "admin.html";
    return;
  }

  currentUser = user;

  status.textContent = `Signed in as ${user.email}`;

  startOrdersListener();
});


/* -----------------------------
   ORDERS LISTENER
----------------------------- */

function startOrdersListener() {
  const ordersRef = collection(db, "orders");

  onSnapshot(
    ordersRef,
    (snapshot) => {
      allOrders = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data()
      }));

      allOrders.sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;

        return bTime - aTime;
      });

      updateStats();
      renderOrders();
      renderOrderHistory(); 
    },
    (error) => {
      console.error(error);

      ordersList.innerHTML = `
        <p class="muted">
          Unable to load orders. Check Firestore rules.
        </p>
      `;
    }
  );
}


/* -----------------------------
   DASHBOARD STATS
----------------------------- */

function updateStats() {
  orderCount.textContent = allOrders.length;

  const manualOrders = allOrders.filter(
    (order) => order.source === "manual"
  );

  manualCount.textContent = manualOrders.length;

  if (allOrders.length > 0) {
    lastOrder.textContent =
      allOrders[0].orderId || allOrders[0].id;
  } else {
    lastOrder.textContent = "—";
  }
}


/* -----------------------------
   CREATE MANUAL ORDER
----------------------------- */

manualOrderForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    formMessage.textContent = "Please sign in again.";
    return;
  }

  const saveButton = document.getElementById("saveOrder");

  saveButton.disabled = true;
  saveButton.textContent = "Creating Order…";
  formMessage.textContent = "";

  const customer =
    document.getElementById("customer").value.trim();

  const phone =
    document.getElementById("phone").value.trim();

  const product =
    document.getElementById("product").value.trim();

  const size =
    document.getElementById("size").value;

  const colour =
    document.getElementById("colour").value;

  const quantity =
    Number(document.getElementById("quantity").value);

  const amount =
    Number(document.getElementById("amount").value);

  const payment =
    document.getElementById("payment").value;

  const address =
    document.getElementById("address").value.trim();

  try {

    const counterRef =
      doc(db, "settings", "orderCounter");

    let newOrderId = "";

    await runTransaction(db, async (transaction) => {

      const counterSnap =
        await transaction.get(counterRef);

      let lastNumber = 51;

      if (counterSnap.exists()) {
        lastNumber =
          Number(
            counterSnap.data().lastNumber || 51
          );
      }

      const nextNumber =
        lastNumber + 1;

      newOrderId =
        `BKR${String(nextNumber).padStart(5, "0")}`;

      const orderRef =
        doc(db, "orders", newOrderId);

      transaction.set(
        counterRef,
        {
          lastNumber: nextNumber,
          updatedAt: serverTimestamp()
        },
        {
          merge: true
        }
      );

      transaction.set(orderRef, {

        orderId: newOrderId,

        source: "manual",

        customer,
        phone,
        product,
        size,
        colour,
        quantity,
        amount,
        payment,
        address,

        status: "Confirmed",
        trackingId: "",

        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),

        createdBy: currentUser.email

      });

    });

    formMessage.textContent =
      `Order ${newOrderId} created successfully.`;

    manualOrderForm.reset();

    document.getElementById("product").value =
      "Barakahh Printed T-Shirt";

    document.getElementById("quantity").value = "1";

    document.getElementById("amount").value = "499";

  } catch (error) {

    console.error(error);

    formMessage.textContent =
      "Order could not be created. Check Firestore rules.";

  }

  saveButton.disabled = false;
  saveButton.textContent = "Create Manual Order";
});


/* -----------------------------
   RENDER ORDERS
----------------------------- */

function renderOrders() {

  if (allOrders.length === 0) {

    ordersList.innerHTML =
      `<p class="muted">No orders yet.</p>`;

    return;
  }

  ordersList.innerHTML = "";

  allOrders.slice(0, 20).forEach((order) => {

    const card =
      document.createElement("div");

    card.className = "order-card";


    /* ORDER ID */

    const title =
      document.createElement("h3");

    title.textContent =
      order.orderId || order.id;


    /* CUSTOMER */

    const customer =
      document.createElement("p");

    customer.textContent =
      `${order.customer || "Customer"} • ${order.phone || ""}`;


    /* PRODUCT */

    const product =
      document.createElement("p");

    product.textContent =
      `${order.product || ""} • Size: ${order.size || "-"} • ${order.colour || "-"}`;


    /* AMOUNT */

    const amount =
      document.createElement("p");

    amount.textContent =
      `₹${order.amount || 0} • Qty: ${order.quantity || 1}`;


    /* STATUS */

    const statusLabel =
      document.createElement("label");

    statusLabel.textContent =
      "Status";


    const statusSelect =
      document.createElement("select");


    [
      "Confirmed",
      "Packed",
      "Shipped",
      "Delivered",
      "Cancelled"
    ].forEach((statusOption) => {

      const option =
        document.createElement("option");

      option.value =
        statusOption;

      option.textContent =
        statusOption;

      if (order.status === statusOption) {
        option.selected = true;
      }

      statusSelect.appendChild(option);

    });


    /* TRACKING ID */

    const trackingInput =
      document.createElement("input");

    trackingInput.type = "text";

    trackingInput.placeholder =
      "Tracking ID";

    trackingInput.value =
      order.trackingId || "";


    /* SAVE BUTTON */

    const saveButton =
      document.createElement("button");

    saveButton.className =
      "button";

    saveButton.textContent =
      "Save Update";


    saveButton.addEventListener(
      "click",
      async () => {

        saveButton.disabled = true;

        saveButton.textContent =
          "Saving…";

        try {

          await updateDoc(
            doc(db, "orders", order.id),
            {
              status: statusSelect.value,

              trackingId:
                trackingInput.value.trim(),

              updatedAt:
                serverTimestamp()
            }
          );

          saveButton.textContent =
            "Saved ✓";

          setTimeout(() => {

            saveButton.textContent =
              "Save Update";

            saveButton.disabled =
              false;

          }, 1200);

        } catch (error) {

          console.error(error);

          saveButton.textContent =
            "Error";

          saveButton.disabled =
            false;
        }
      }
    );


    /* DELETE BUTTON */

    const deleteButton =
      document.createElement("button");

    deleteButton.className =
      "button";

    deleteButton.textContent =
      "Delete Order";


    deleteButton.addEventListener(
      "click",
      async () => {

        const orderNumber =
          order.orderId || order.id;

        const confirmed =
          window.confirm(
            `Delete order ${orderNumber}? This cannot be undone.`
          );

        if (!confirmed) {
          return;
        }

        deleteButton.disabled = true;

        deleteButton.textContent =
          "Deleting…";

        try {

          await deleteDoc(
            doc(db, "orders", order.id)
          );

          deleteButton.textContent =
            "Deleted ✓";

        } catch (error) {

          console.error(error);

          deleteButton.textContent =
            "Delete Error";

          deleteButton.disabled =
            false;
        }

      }
    );


    /* ADD ELEMENTS */

    card.appendChild(title);

    card.appendChild(customer);

    card.appendChild(product);

    card.appendChild(amount);

    card.appendChild(statusLabel);

    card.appendChild(statusSelect);

    card.appendChild(trackingInput);

    card.appendChild(saveButton);

    card.appendChild(deleteButton);

    ordersList.appendChild(card);

  });
}/* -----------------------------
   RENDER ORDER HISTORY
----------------------------- */
function renderOrderHistory() {

  if (allOrders.length === 0) {

    orderHistoryList.innerHTML =
      `<p class="muted">No order history yet.</p>`;

    return;
  }

  orderHistoryList.innerHTML = "";

  allOrders.forEach((order) => {

    const card =
      document.createElement("div");

    card.className = "order-card order-card--readonly";


    /* ORDER ID */

    const title =
      document.createElement("h3");

    title.textContent =
      order.orderId || order.id;


    /* CUSTOMER */

    const customer =
      document.createElement("p");

    customer.textContent =
      `Customer: ${order.customer || "-"}`;


    /* PHONE */

    const phone =
      document.createElement("p");

    phone.textContent =
      `Phone: ${order.phone || "-"}`;


    /* PRODUCT */

    const product =
      document.createElement("p");

    product.textContent =
      `Product: ${order.product || "-"}`;


    /* SIZE */

    const size =
      document.createElement("p");

    size.textContent =
      `Size: ${order.size || "-"}`;


    /* COLOUR */

    const colour =
      document.createElement("p");

    colour.textContent =
      `Colour: ${order.colour || "-"}`;


    /* QUANTITY */

    const quantity =
      document.createElement("p");

    quantity.textContent =
      `Quantity: ${order.quantity || 1}`;


    /* AMOUNT */

    const amount =
      document.createElement("p");

    amount.textContent =
      `Amount: ₹${order.amount || 0}`;


    /* PAYMENT */

    const payment =
      document.createElement("p");

    payment.textContent =
      `Payment: ${order.payment || "-"}`;


    /* ADDRESS */

    const address =
      document.createElement("p");

    address.textContent =
      `Address: ${order.address || "-"}`;


    /* STATUS (read-only text, not a select) */

    const statusText =
      document.createElement("p");

    statusText.textContent =
      `Status: ${order.status || "Confirmed"}`;


    /* TRACKING ID (read-only text, only if present) */

    let trackingText = null;

    if (order.trackingId) {

      trackingText =
        document.createElement("p");

      trackingText.textContent =
        `Tracking ID: ${order.trackingId}`;
    }


    /* ADD EVERYTHING TO CARD */

    card.appendChild(title);
    card.appendChild(customer);
    card.appendChild(phone);
    card.appendChild(product);
    card.appendChild(size);
    card.appendChild(colour);
    card.appendChild(quantity);
    card.appendChild(amount);
    card.appendChild(payment);
    card.appendChild(address);
    card.appendChild(statusText);

    if (trackingText) {
      card.appendChild(trackingText);
    }

    orderHistoryList.appendChild(card);

  });
}



renderOrderHistory();
/* -----------------------------
   SIGN OUT
----------------------------- */

logoutButton.addEventListener(
  "click",
  async () => {

    await signOut(auth);

    window.location.href =
      "admin.html";

  }
);
