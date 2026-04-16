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
    password: process.env.DB_PASSWORD || "Srushti@123",
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

async function ensureSupplyStatusColumn() {
    try {
        const databaseName = process.env.DB_NAME || "disaster_relief_db_final";
        const [rows] = await dbPromise.query(
            `SELECT COLUMN_NAME FROM information_schema.columns
             WHERE table_schema = ? AND table_name = 'supply' AND column_name = 'status'`,
            [databaseName]
        );

        if (rows.length === 0) {
            console.log("Adding missing supply.status column...");
            await dbPromise.query(
                `ALTER TABLE supply ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'PENDING'`
            );
        }
    } catch (err) {
        console.error("Error ensuring supply.status column:", err.message);
    }
}

ensureSupplyStatusColumn();

// Serve frontend files
app.use(express.static(path.join(__dirname, "../Frontend")));
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../Frontend/login.html"));
});

// TEST API
app.get("/test", (req, res) => {
    res.send("Backend working!");
});

// ===== LOGIN API =====
app.post("/login", async (req, res) => {
    const { email, role } = req.body;
    try {
        // Simple login - just validate role
        const validRoles = ["Admin", "Inventory Manager", "Camp Manager", "Supplier"];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid role" });
        }
        
        // Return success with user session info
        res.json({
            success: true,
            role: role,
            email: email,
            redirect: getRedirectPath(role)
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

function getRedirectPath(role) {
    switch(role) {
        case "Admin":
            return "/admin.html";
        case "Inventory Manager":
            return "/inventory_manager.html";
        case "Camp Manager":
            return "/camp_manager.html";
        case "Supplier":
            return "/supplier.html";
        default:
            return "/login.html";
    }
}

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

// ===== SIMPLE RESOURCES API FOR DROPDOWN =====
app.get("/resources-simple", async (req, res) => {
    try {
        const [rows] = await dbPromise.query("SELECT resource_id, resource_name FROM resource");
        res.json(rows);
    } catch (err) {
        res.status(500).json(err);
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
        const [pendingRequests] = await dbPromise.query("SELECT COUNT(*) AS pendingCount FROM supply WHERE status = 'PENDING'");
        const [activeShipments] = await dbPromise.query("SELECT COUNT(*) AS activeCount FROM supply WHERE status = 'PENDING' AND supply_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)");
        const [deliveredTotal] = await dbPromise.query("SELECT IFNULL(SUM(quantity_supplied), 0) AS deliveredTotal FROM supply WHERE status = 'APPROVED'");

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

app.get("/supplier-fulfillments", async (req, res) => {
    try {
        const [rows] = await dbPromise.query(
            `SELECT rf.fulfillment_id,
                    rf.request_id,
                    rf.quantity_supplied,
                    rf.fulfillment_status,
                    rf.fulfillment_date,
                    r.resource_name,
                    rc.name AS camp_name
             FROM request_fulfillment rf
             LEFT JOIN resource_request rr ON rf.request_id = rr.request_id
             LEFT JOIN resource r ON rr.resource_id = r.resource_id
             LEFT JOIN relief_camp rc ON rr.camp_id = rc.camp_id
             ORDER BY rf.fulfillment_date DESC
             LIMIT 10`
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

// ===== RESOURCE LIST (for form selections) =====
app.get("/resources-list", async (req, res) => {
    try {
        const [rows] = await dbPromise.query("SELECT resource_id, resource_name, unit FROM resource");
        res.json({ success: true, resources: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== CAMP DETAILS =====
app.get("/camp-details", async (req, res) => {
    const campId = 1;
    try {
        const [rows] = await dbPromise.query(
            `SELECT
                rc.name AS camp_name,
                rc.location,
                rc.capacity,
                aa.area_name,
                d.disaster_type
             FROM relief_camp rc
             LEFT JOIN affected_area aa ON rc.area_id = aa.area_id
             LEFT JOIN disaster d ON aa.disaster_id = d.disaster_id
             WHERE rc.camp_id = ?`,
            [campId]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: "Camp not found" });
        }

        res.json(rows[0]);
    } catch (err) {
        res.status(500).json(err);
    }
});

// ===== CAMP STOCK =====
app.get("/camp-stock", async (req, res) => {
    const campId = 1;   
    try {
        const [rows] = await dbPromise.query(
            `SELECT r.resource_name,
                    cs.quantity_available AS quantity
             FROM camp_stock cs
             LEFT JOIN resource r ON cs.resource_id = r.resource_id
             WHERE cs.camp_id = ?
             ORDER BY r.resource_name ASC`,
            [campId]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json(err);
    }
});

// ===== GET ALL REQUESTS (for Admin & Inventory Manager) =====
app.get("/requests", async (req, res) => {
    const { camp_id } = req.query;
    try {
        let query = `SELECT rr.request_id,
                            rr.quantity_required,
                            rr.priority_level,
                            rr.status,
                            rr.request_date,
                            rc.camp_id,
                            rc.name AS camp_name,
                            r.resource_id,
                            r.resource_name,
                            IFNULL((SELECT SUM(quantity_supplied) FROM request_fulfillment rf WHERE rf.request_id = rr.request_id), 0) AS quantity_supplied,
                            GREATEST(0, rr.quantity_required - IFNULL((SELECT SUM(quantity_supplied) FROM request_fulfillment rf WHERE rf.request_id = rr.request_id), 0)) AS remaining_quantity
                     FROM resource_request rr
                     LEFT JOIN relief_camp rc ON rr.camp_id = rc.camp_id
                     LEFT JOIN resource r ON rr.resource_id = r.resource_id`;
        const params = [];

        if (camp_id) {
            query += " WHERE rr.camp_id = ?";
            params.push(camp_id);
        }

        query += " ORDER BY rr.request_date DESC";

        const [rows] = await dbPromise.query(query, params);
        res.json({ success: true, requests: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== GET REQUESTS FOR SPECIFIC CAMP (for Camp Manager) =====
app.get("/camp-requests/:campId", async (req, res) => {
    const { campId } = req.params;
    try {
        const [rows] = await dbPromise.query(
            `SELECT rr.request_id,
                    rr.quantity_required,
                    rr.priority_level,
                    rr.status,
                    rr.request_date,
                    r.resource_name
             FROM resource_request rr
             LEFT JOIN resource r ON rr.resource_id = r.resource_id
             WHERE rr.camp_id = ?
             ORDER BY rr.request_date DESC`,
            [campId]
        );
        res.json({ success: true, requests: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== CREATE NEW REQUEST (Camp Manager) =====
app.post("/requests", async (req, res) => {
    const { campId, resourceId, quantityRequired, priorityLevel } = req.body;
    try {
        // Validate inputs
        if (!campId || !resourceId || !quantityRequired || !priorityLevel) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const requestDate = new Date().toISOString().split('T')[0];
        
        const [result] = await dbPromise.query(
            `INSERT INTO resource_request (camp_id, resource_id, quantity_required, priority_level, status, request_date)
             VALUES (?, ?, ?, ?, 'PENDING', ?)`,
            [campId, resourceId, quantityRequired, priorityLevel, requestDate]
        );
        
        res.json({
            success: true,
            message: "Request created successfully",
            requestId: result.insertId
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== CREATE NEW REQUEST (Camp Manager) =====
app.post("/request", async (req, res) => {
    const { camp_id, resource_id, quantity } = req.body;
    try {
        if (!camp_id || !resource_id || !quantity || parseInt(quantity, 10) <= 0) {
            return res.status(400).json({ success: false, message: "camp_id, resource_id, and quantity (>0) are required" });
        }

        const requestDate = new Date().toISOString().split("T")[0];
        const [result] = await dbPromise.query(
            `INSERT INTO resource_request (camp_id, resource_id, quantity_required, priority_level, status, request_date)
             VALUES (?, ?, ?, NULL, 'PENDING', ?)`,
            [camp_id, resource_id, parseInt(quantity, 10), requestDate]
        );

        res.json({ success: true, message: "Request created successfully", requestId: result.insertId });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== APPROVE/REJECT REQUEST (Admin) =====
app.put("/requests/:id", async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    
    try {
        // Validate status
        if (!["PENDING", "PARTIAL", "COMPLETED"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid status" });
        }

        const [result] = await dbPromise.query(
            "UPDATE resource_request SET status = ? WHERE request_id = ?",
            [status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        res.json({ success: true, message: "Request updated successfully" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== GET INVENTORY (Inventory Manager) =====
app.get("/inventory", async (req, res) => {
    try {
        const [rows] = await dbPromise.query(
            `SELECT s.inv_stock_id,
                    s.quantity_available,
                    s.minimum_threshold,
                    ci.name AS inventory_name,
                    ci.location,
                    r.resource_id,
                    r.resource_name,
                    r.unit
             FROM inventory_stock s
             LEFT JOIN central_inventory ci ON s.inventory_id = ci.inventory_id
             LEFT JOIN resource r ON s.resource_id = r.resource_id
             ORDER BY ci.name, r.resource_name`
        );
        res.json({ success: true, inventory: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== DISPATCH RESOURCES (Inventory Manager) =====
app.post("/dispatch", async (req, res) => {
    const { requestId, quantitySupplied } = req.body;
    
    try {
        if (!requestId || !quantitySupplied) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Get request details
        const [requests] = await dbPromise.query(
            "SELECT * FROM resource_request WHERE request_id = ?",
            [requestId]
        );

        if (requests.length === 0) {
            return res.status(404).json({ success: false, message: "Request not found" });
        }

        const request = requests[0];
        if (request.status === 'COMPLETED') {
            return res.status(400).json({ success: false, message: "Request is already completed" });
        }

        // Get inventory stock
        const [stocks] = await dbPromise.query(
            `SELECT * FROM inventory_stock 
             WHERE resource_id = ? 
             LIMIT 1`,
            [request.resource_id]
        );

        if (stocks.length === 0) {
            return res.status(400).json({ success: false, message: "Inventory not found" });
        }

        const stock = stocks[0];

        // Check if sufficient quantity available
        if (stock.quantity_available < quantitySupplied) {
            return res.status(400).json({ 
                success: false, 
                message: "Insufficient inventory. Available: " + stock.quantity_available 
            });
        }

        // Get total supplied so far for this request
        const [fulfillments] = await dbPromise.query(
            "SELECT IFNULL(SUM(quantity_supplied), 0) AS totalSupplied FROM request_fulfillment WHERE request_id = ?",
            [requestId]
        );
        const totalSuppliedSoFar = fulfillments[0].totalSupplied || 0;
        const cumulativeSupplied = totalSuppliedSoFar + quantitySupplied;

        // Update inventory
        const newQuantity = stock.quantity_available - quantitySupplied;
        await dbPromise.query(
            "UPDATE inventory_stock SET quantity_available = ? WHERE inv_stock_id = ?",
            [newQuantity, stock.inv_stock_id]
        );

        // Update camp stock
        const [campStocks] = await dbPromise.query(
            `SELECT * FROM camp_stock WHERE camp_id = ? AND resource_id = ? LIMIT 1`,
            [request.camp_id, request.resource_id]
        );

        if (campStocks.length > 0) {
            const campStock = campStocks[0];
            await dbPromise.query(
                "UPDATE camp_stock SET quantity_available = ? WHERE stock_id = ?",
                [campStock.quantity_available + quantitySupplied, campStock.stock_id]
            );
        } else {
            await dbPromise.query(
                `INSERT INTO camp_stock (camp_id, resource_id, quantity_available)
                 VALUES (?, ?, ?)`,
                [request.camp_id, request.resource_id, quantitySupplied]
            );
        }

        // Create fulfillment record
        const fulfillmentDate = new Date().toISOString().split('T')[0];
        const fulfillmentStatus = cumulativeSupplied >= request.quantity_required ? "COMPLETED" : "PARTIAL";
        
        const [result] = await dbPromise.query(
            `INSERT INTO request_fulfillment (request_id, quantity_supplied, fulfillment_date, fulfillment_status)
             VALUES (?, ?, ?, ?)`,
            [requestId, quantitySupplied, fulfillmentDate, fulfillmentStatus]
        );

        // Update request status based on cumulative supply
        await dbPromise.query(
            "UPDATE resource_request SET status = ? WHERE request_id = ?",
            [fulfillmentStatus, requestId]
        );

        res.json({
            success: true,
            message: "Dispatch recorded successfully",
            fulfillmentId: result.insertId,
            cumulativeSupplied,
            remainingQuantity: Math.max(0, request.quantity_required - cumulativeSupplied)
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== GET SUPPLY HISTORY (Supplier) =====
app.get("/supply", async (req, res) => {
    try {
        const [rows] = await dbPromise.query(
            `SELECT sp.supply_id,
                    sp.supply_date,
                    sp.quantity_supplied,
                    r.resource_name,
                    ci.name AS inventory_name,
                    sup.supplier_name,
                    CASE
                        WHEN sp.supply_date > CURDATE() THEN 'SCHEDULED'
                        WHEN sp.supply_date = CURDATE() THEN 'SCHEDULED TODAY'
                        ELSE 'DELIVERED'
                    END AS order_status
             FROM supply sp
             LEFT JOIN resource r ON sp.resource_id = r.resource_id
             LEFT JOIN central_inventory ci ON sp.inventory_id = ci.inventory_id
             LEFT JOIN supplier sup ON sp.supplier_id = sup.supplier_id
             ORDER BY sp.supply_date DESC`
        );
        res.json({ success: true, supplies: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get("/supplier-orders", async (req, res) => {
    try {
        const [rows] = await dbPromise.query(
            `SELECT sp.supply_id,
                    sp.supply_date,
                    sp.quantity_supplied,
                    r.resource_name,
                    ci.name AS inventory_name,
                    sup.supplier_name,
                    'PENDING' AS order_status
             FROM supply sp
             LEFT JOIN resource r ON sp.resource_id = r.resource_id
             LEFT JOIN central_inventory ci ON sp.inventory_id = ci.inventory_id
             LEFT JOIN supplier sup ON sp.supplier_id = sup.supplier_id
             WHERE sp.status = 'PENDING'
             ORDER BY sp.supply_date ASC, sp.supply_id ASC`
        );
        res.json({ success: true, orders: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get("/supplier-deliveries", async (req, res) => {
    try {
        const [rows] = await dbPromise.query(
            `SELECT sp.supply_id,
                    sp.supply_date,
                    sp.quantity_supplied,
                    r.resource_name,
                    ci.name AS inventory_name,
                    sup.supplier_name,
                    'APPROVED' AS order_status
             FROM supply sp
             LEFT JOIN resource r ON sp.resource_id = r.resource_id
             LEFT JOIN central_inventory ci ON sp.inventory_id = ci.inventory_id
             LEFT JOIN supplier sup ON sp.supplier_id = sup.supplier_id
             WHERE sp.status = 'APPROVED'
             ORDER BY sp.supply_date DESC`
        );
        res.json({ success: true, deliveries: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== ADD SUPPLY (Supplier) =====
app.post("/supply", async (req, res) => {
    const { supplierId, inventoryId, resourceId, quantitySupplied, supplyDate } = req.body;
    
    try {
        if (!supplierId || !inventoryId || !resourceId || !quantitySupplied) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        // Insert supply record as a pending supplier order.
        const [result] = await dbPromise.query(
            `INSERT INTO supply (supplier_id, inventory_id, resource_id, quantity_supplied, supply_date, status)
             VALUES (?, ?, ?, ?, ?, 'PENDING')`,
            [supplierId, inventoryId, resourceId, quantitySupplied, supplyDate || new Date().toISOString().split('T')[0]]
        );

        res.json({
            success: true,
            message: "Supplier order created successfully",
            supplyId: result.insertId
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post("/supply/:id/approve", async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await dbPromise.query(
            "SELECT * FROM supply WHERE supply_id = ?",
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: "Supplier order not found" });
        }

        const order = rows[0];
        if (order.status !== 'PENDING') {
            return res.status(400).json({ success: false, message: "Order is already approved or not pending" });
        }

        const [stocks] = await dbPromise.query(
            `SELECT * FROM inventory_stock WHERE inventory_id = ? AND resource_id = ?`,
            [order.inventory_id, order.resource_id]
        );

        if (stocks.length > 0) {
            const stock = stocks[0];
            const newQuantity = stock.quantity_available + order.quantity_supplied;
            await dbPromise.query(
                "UPDATE inventory_stock SET quantity_available = ? WHERE inv_stock_id = ?",
                [newQuantity, stock.inv_stock_id]
            );
        } else {
            await dbPromise.query(
                `INSERT INTO inventory_stock (inventory_id, resource_id, quantity_available, minimum_threshold)
                 VALUES (?, ?, ?, 0)`,
                [order.inventory_id, order.resource_id, order.quantity_supplied]
            );
        }

        await dbPromise.query(
            "UPDATE supply SET status = 'APPROVED' WHERE supply_id = ?",
            [id]
        );

        res.json({ success: true, message: "Supplier order approved and inventory updated" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== GET CAMPS (for dropdown in forms) =====
app.get("/camps", async (req, res) => {
    try {
        const [rows] = await dbPromise.query("SELECT camp_id, name FROM relief_camp");
        res.json({ success: true, camps: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== GET SUPPLIERS (for dropdown in forms) =====
app.get("/suppliers", async (req, res) => {
    try {
        const [rows] = await dbPromise.query("SELECT supplier_id, supplier_name FROM supplier");
        res.json({ success: true, suppliers: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ===== GET INVENTORIES (for dropdown in forms) =====
app.get("/inventories", async (req, res) => {
    try {
        const [rows] = await dbPromise.query(
            `SELECT inventory_id,
                    name,
                    location,
                    total_capacity,
                    created_at
             FROM central_inventory`
        );
        res.json({ success: true, inventories: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Keep old endpoints for compatibility
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

app.listen(5000, () => {
    console.log("Server running on port 5000");
});