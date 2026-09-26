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
    lastOrder.textContent = allOrders[0].orderId || allOrders[0].id;
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

  const customer = document.getElementById("customer").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const product = document.getElementById("product").value.trim();
  const size = document.getElementById("size").value;
  const colour = document.getElementById("colour").value;
  const quantity = Number(document.getElementById("quantity").value);
  const amount = Number(document.getElementById("amount").value);
  const payment = document.getElementById("payment").value;
  const address = document.getElementById("address").value.trim();

  try {
    const counterRef = doc(db, "settings", "orderCounter");

    let newOrderId = "";

    await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);

      let lastNumber = 51;

      if (counterSnap.exists()) {
        lastNumber = Number(counterSnap.data().lastNumber || 51);
      }

      const nextNumber = lastNumber + 1;

      newOrderId = `BKR${String(nextNumber).padStart(5, "0")}`;

      const orderRef = doc(db, "orders", newOrderId);

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
   RENDER RECENT ORDERS
----------------------------- */

function renderOrders() {
  if (allOrders.length === 0) {
    ordersList.innerHTML =
      `<p class="muted">No orders yet.</p>`;

    return;
  }

  ordersList.innerHTML = "";

  allOrders.slice(0, 20).forEach((order) => {
    const card = document.createElement("div");

    card.className = "order-card";

    const title = document.createElement("h3");
    title.textContent =
      order.orderId || order.id;

    const customer = document.createElement("p");
    customer.textContent =
      `${order.customer || "Customer"} • ${order.phone || ""}`;

    const product = document.createElement("p");
    product.textContent =
      `${order.product || ""} • Size: ${order.size || "-"} • ${order.colour || "-"}`;

    const amount = document.createElement("p");
    amount.textContent =
      `₹${order.amount || 0} • Qty: ${order.quantity || 1}`;

    const statusLabel = document.createElement("label");
    statusLabel.textContent = "Status";

    const statusSelect = document.createElement("select");

    [
      "Confirmed",
      "Packed",
      "Shipped",
      "Delivered",
      "Cancelled"
    ].forEach((statusOption) => {
      const option = document.createElement("option");

      option.value = statusOption;
      option.textContent = statusOption;

      if (order.status === statusOption) {
        option.selected = true;
      }

      statusSelect.appendChild(option);
    });

    const trackingInput = document.createElement("input");

    trackingInput.type = "text";
    trackingInput.placeholder = "Tracking ID";
    trackingInput.value = order.trackingId || "";

    const saveButton = document.createElement("button");

    saveButton.className = "button";
    saveButton.textContent = "Save Update";

    saveButton.addEventListener("click", async () => {
      saveButton.disabled = true;
      saveButton.textContent = "Saving…";

      try {
        await updateDoc(
          doc(db, "orders", order.id),
          {
            status: statusSelect.value,
            trackingId: trackingInput.value.trim(),
            updatedAt: serverTimestamp()
          }
        );

        saveButton.textContent = "Saved ✓";

        setTimeout(() => {
          saveButton.textContent = "Save Update";
          saveButton.disabled = false;
        }, 1200);

      } catch (error) {
        console.error(error);

        saveButton.textContent = "Error";
        saveButton.disabled = false;
      }
    });

    card.appendChild(title);
    card.appendChild(customer);
    card.appendChild(product);
    card.appendChild(amount);
    card.appendChild(statusLabel);
    card.appendChild(statusSelect);
    card.appendChild(trackingInput);
    card.appendChild(saveButton);

    ordersList.appendChild(card);
  });
}


/* -----------------------------
   SIGN OUT
----------------------------- */

logoutButton.addEventListener("click", async () => {
  await signOut(auth);

  window.location.href = "admin.html";
});
