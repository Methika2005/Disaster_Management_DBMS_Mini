const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// DB connection
const db = mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "root",
    database: process.env.DB_NAME || "disaster_relief_db_final"
});

db.connect((err) => {
    if (err) {
        console.error("Database connection error:", err.message);
        return;
    }
    console.log("Connected to MySQL database");
});

const dbPromise = db.promise();

// Serve frontend files
app.use(express.static(path.join(__dirname, "../Frontend")));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../Frontend/admin.html"));
});

// TEST API
app.get("/test", (req, res) => {
    res.send("Backend working!");
});

app.get("/resources", async (req, res) => {
    try {
        const [rows] = await dbPromise.query(
            `SELECT r.resource_id,
                    r.resource_name,
                    r.unit,
                    IFNULL(SUM(s.quantity_available), 0) AS total_available
             FROM resource r
             LEFT JOIN inventory_stock s ON r.resource_id = s.resource_id
             GROUP BY r.resource_id, r.resource_name, r.unit`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get("/inventories", async (req, res) => {
    try {
        const [rows] = await dbPromise.query("SELECT * FROM central_inventory");
        res.json(rows);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get("/requests", async (req, res) => {
    try {
        const [rows] = await dbPromise.query(
            `SELECT rr.request_id,
                    rr.quantity_required,
                    rr.priority_level,
                    rr.status,
                    rr.request_date,
                    rc.name AS camp_name,
                    r.resource_name
             FROM resource_request rr
             LEFT JOIN relief_camp rc ON rr.camp_id = rc.camp_id
             LEFT JOIN resource r ON rr.resource_id = r.resource_id
             ORDER BY rr.request_date DESC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get("/inventory-stock", async (req, res) => {
    try {
        const [rows] = await dbPromise.query(
            `SELECT s.inv_stock_id,
                    s.quantity_available,
                    s.minimum_threshold,
                    ci.name AS inventory_name,
                    ci.location,
                    r.resource_name
             FROM inventory_stock s
             LEFT JOIN central_inventory ci ON s.inventory_id = ci.inventory_id
             LEFT JOIN resource r ON s.resource_id = r.resource_id
             ORDER BY ci.name, r.resource_name`
        );
        res.json({ success: true, inventory: rows });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get("/inventory-dashboard", async (req, res) => {
    try {
        const [currentStock] = await dbPromise.query("SELECT IFNULL(SUM(quantity_available), 0) AS totalStock FROM inventory_stock");
        const [incomingSupplies] = await dbPromise.query("SELECT COUNT(*) AS incomingCount FROM supply WHERE supply_date > CURDATE()");
        const [pendingRequests] = await dbPromise.query("SELECT COUNT(*) AS pendingCount FROM resource_request WHERE status = 'PENDING'");
        const [dispatchedToday] = await dbPromise.query("SELECT IFNULL(SUM(quantity_supplied), 0) AS dispatched FROM request_fulfillment WHERE DATE(fulfillment_date) = CURDATE()");

        res.json({
            success: true,
            currentStockCount: currentStock[0].totalStock || 0,
            incomingSuppliesCount: incomingSupplies[0].incomingCount || 0,
            pendingRequestsCount: pendingRequests[0].pendingCount || 0,
            dispatchedTodayCount: dispatchedToday[0].dispatched || 0
        });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get("/supplier-dashboard", async (req, res) => {
    try {
        const [pendingRequests] = await dbPromise.query("SELECT COUNT(*) AS pendingCount FROM supply WHERE supply_date >= CURDATE()");
        const [activeShipments] = await dbPromise.query("SELECT COUNT(*) AS activeCount FROM supply WHERE supply_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)");
        const [deliveredTotal] = await dbPromise.query("SELECT IFNULL(SUM(quantity_supplied), 0) AS deliveredTotal FROM request_fulfillment WHERE fulfillment_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)");

        res.json({
            success: true,
            pendingSupplyRequests: pendingRequests[0].pendingCount || 0,
            activeShipments: activeShipments[0].activeCount || 0,
            deliveredTotal: deliveredTotal[0].deliveredTotal || 0
        });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get("/supplier-requests", async (req, res) => {
    try {
        const [rows] = await dbPromise.query(
            `SELECT sp.supply_id,
                    sp.supply_date,
                    sp.status,
                    r.resource_name,
                    rc.name AS camp_name
             FROM supply sp
             LEFT JOIN resource r ON sp.resource_id = r.resource_id
             LEFT JOIN relief_camp rc ON sp.camp_id = rc.camp_id
             WHERE sp.supply_date >= CURDATE()
             ORDER BY sp.supply_date ASC`
        );
        res.json({ success: true, requests: rows });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get("/supplier-deliveries", async (req, res) => {
    try {
        const [rows] = await dbPromise.query(
            `SELECT rf.fulfillment_id,
                    rf.quantity_supplied,
                    rf.fulfillment_date,
                    r.resource_name,
                    rc.name AS camp_name
             FROM request_fulfillment rf
             LEFT JOIN resource_request rr ON rf.request_id = rr.request_id
             LEFT JOIN resource r ON rr.resource_id = r.resource_id
             LEFT JOIN relief_camp rc ON rr.camp_id = rc.camp_id
             ORDER BY rf.fulfillment_date DESC
             LIMIT 4`
        );
        res.json({ success: true, deliveries: rows });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get("/camp-dashboard", async (req, res) => {
    try {
        const [stockTotals] = await dbPromise.query(
            "SELECT IFNULL(SUM(quantity_available), 0) AS totalAvailable, IFNULL(SUM(minimum_threshold), 0) AS totalThreshold FROM inventory_stock"
        );
        const [totalRequests] = await dbPromise.query(
            "SELECT COUNT(*) AS totalCount FROM resource_request"
        );
        const [pendingRequests] = await dbPromise.query(
            "SELECT COUNT(*) AS pendingCount FROM resource_request WHERE status = 'PENDING'"
        );
        const [highPriority] = await dbPromise.query(
            "SELECT COUNT(*) AS highCount FROM resource_request WHERE priority_level IN ('HIGH', 'high') AND status = 'PENDING'"
        );
        const [pendingFulfillment] = await dbPromise.query(
            "SELECT COUNT(*) AS pendingFulfillmentCount FROM resource_request WHERE status <> 'COMPLETED'"
        );

        const totalAvailable = stockTotals[0].totalAvailable || 0;
        const totalThreshold = stockTotals[0].totalThreshold || 0;
        const localStockPercent = totalThreshold > 0 ? Math.min(100, Math.round((totalAvailable / totalThreshold) * 100)) : 100;

        res.json({
            success: true,
            localStockPercent,
            totalRequests: totalRequests[0].totalCount || 0,
            pendingRequests: pendingRequests[0].pendingCount || 0,
            highPriority: highPriority[0].highCount || 0,
            pendingFulfillment: pendingFulfillment[0].pendingFulfillmentCount || 0
        });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get("/camp-shortages", async (req, res) => {
    try {
        const [rows] = await dbPromise.query(
            `SELECT s.quantity_available,
                    s.minimum_threshold,
                    r.resource_name
             FROM inventory_stock s
             LEFT JOIN resource r ON s.resource_id = r.resource_id
             ORDER BY CASE WHEN s.minimum_threshold = 0 THEN 0 ELSE s.quantity_available / s.minimum_threshold END ASC,
                      s.quantity_available ASC
             LIMIT 4`
        );
        res.json({ success: true, shortages: rows });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get("/camp-requests", async (req, res) => {
    try {
        const [rows] = await dbPromise.query(
            `SELECT rr.request_id,
                    rr.quantity_required,
                    rr.priority_level,
                    rr.status,
                    rr.request_date,
                    rc.name AS camp_name,
                    r.resource_name
             FROM resource_request rr
             LEFT JOIN relief_camp rc ON rr.camp_id = rc.camp_id
             LEFT JOIN resource r ON rr.resource_id = r.resource_id
             ORDER BY rr.request_date DESC`
        );
        res.json({ success: true, requests: rows });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post("/camp-update-request-status", async (req, res) => {
    const { requestId, status } = req.body;
    try {
        await dbPromise.query("UPDATE resource_request SET status = ? WHERE request_id = ?", [status, requestId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get("/inventory-requests", async (req, res) => {
    try {
        const [rows] = await dbPromise.query(
            `SELECT rr.request_id,
                    rr.quantity_required,
                    rr.priority_level,
                    LOWER(rr.status) AS status,
                    rr.request_date,
                    rc.name AS camp_name,
                    rc.location AS camp_location,
                    r.resource_name
             FROM resource_request rr
             LEFT JOIN relief_camp rc ON rr.camp_id = rc.camp_id
             LEFT JOIN resource r ON rr.resource_id = r.resource_id
             WHERE rr.status = 'PENDING'
             ORDER BY rr.priority_level DESC, rr.request_date ASC`
        );
        res.json({ success: true, requests: rows });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.post("/update-request-status", async (req, res) => {
    const { requestId, status } = req.body;
    try {
        await dbPromise.query("UPDATE resource_request SET status = ? WHERE request_id = ?", [status, requestId]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.get("/dashboard", async (req, res) => {
    try {
        const [requestRows] = await dbPromise.query("SELECT COUNT(*) AS totalRequests FROM resource_request");
        const [campRows] = await dbPromise.query("SELECT COUNT(*) AS totalCamps FROM relief_camp");
        const [inventoryRows] = await dbPromise.query("SELECT IFNULL(SUM(quantity_available), 0) AS totalInventory FROM inventory_stock");
        const [shortageRows] = await dbPromise.query("SELECT COUNT(*) AS shortageCount FROM inventory_stock WHERE quantity_available < minimum_threshold");

        res.json({
            totalRequests: requestRows[0].totalRequests || 0,
            totalCamps: campRows[0].totalCamps || 0,
            totalInventory: inventoryRows[0].totalInventory || 0,
            shortageCount: shortageRows[0].shortageCount || 0
        });
    } catch (err) {
        res.status(500).send(err);
    }
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});