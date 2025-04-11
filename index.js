


const pg = require("pg");
const express = require("express");
const morgan = require("morgan");

const client = new pg.Client(
    process.env.DATABASE_URL || "postgres://postgres@localhost/acme_directory_db"
);

const server = express();

const port = process.env.PORT || 8000;
server.listen(port, () => console.log(`listening on port ${port}`));

const init = async () => {
    await client.connect();
    console.log("connected to database");

    let SQL = `
    DROP TABLE IF EXISTS employees;
    DROP TABLE IF EXISTS department;

    CREATE TABLE department(
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL
    );
    CREATE TABLE employees(
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP DEFAULT now(),
    department_id INTEGER REFERENCES department(id) NOT NULL
    );
    `;

    await client.query(SQL);
    console.log("tables created");

    SQL = ` 
  INSERT INTO department(name) VALUES ('Sales');
  INSERT INTO department(name) VALUES ('Marketing');
  INSERT INTO department(name) VALUES ('Engineering');
  INSERT INTO department(name) VALUES ('Finance');
  INSERT INTO department(name) VALUES ('Legal');

    INSERT INTO employees(name, department_id) VALUES('Jolene', (SELECT id FROM department WHERE name = 'Sales'));
    INSERT INTO employees(name, department_id) VALUES('Marla', (SELECT id FROM department WHERE name = 'Marketing'));
    INSERT INTO employees(name, department_id) VALUES('Charles', (SELECT id FROM department WHERE name = 'Engineering'));
    INSERT INTO employees(name, department_id) VALUES('Kendall', (SELECT id FROM department WHERE name = 'Finance'));
    INSERT INTO employees(name, department_id) VALUES('Bri', (SELECT id FROM department WHERE name = 'Legal'));
    `;

    await client.query(SQL);
    console.log("data seeded");
};

init();

// Middleware
server.use(express.json());
server.use(morgan("dev"));


// Routes
server.get('/api/employees', async (req, res, next) => {
    try {
        const SQL = 'SELECT * FROM employee';
        const response = await client.query(SQL);
        res.status(200).json(response.rows);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve employees' });
    }
});
server.get('/api/departments', async (req, res, next) => {
    try {
        const SQL = 'SELECT * FROM department';
        const response = await client.query(SQL);
        res.send(response.rows);
    } catch (error) {
        next(error);
    }
});

// POST /api/employees: Create a new employee
server.post('/api/employees', async (req, res, next) => {
    try {
        const newEmployee = req.body;
        const SQL = 'INSERT INTO employees(name, department_id) VALUES($1, $2) RETURNING *';
        const response = await client.query(SQL, [newEmployee.name, newEmployee.department_id]);
        res.status(201).json(response.rows[0]);
    } catch (error) {
        next(error);
    }
});

// DELETE /api/employees/:id: Delete an employee by ID
server.delete('/api/employees/:id', async (req, res, next) => {
    try {
        const employeeId = req.params.id;
        const SQL = 'DELETE FROM employees WHERE id = $1 RETURNING *';
        const response = await client.query(SQL, [employeeId]);
        if (response.rows.length === 0) {
            res.status(404).send('Employee not found');
        } else {
            res.status(204).send();
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete employee' });
    }
});

// PUT /api/employees/:id: Update an employee by ID
server.put('/api/employees/:id', async (req, res, next) => {
    try {
        const employeeId = req.params.id;
        const updatedEmployee = req.body;
        const SQL = 'UPDATE employees SET name = $1, department_id = $2, updated_at = $3 WHERE id = $4 RETURNING *';
        const response = await client.query(SQL, [updatedEmployee.name, updatedEmployee.department_id, new Date(), employeeId]);
        if (response.rows.length === 0) {
            res.status(404).send('Employee not found');
        } else {
            res.status(200).json(response.rows[0]);
        }
    } catch (error) {
        next(error);
    }
});

// Error handling middleware
server.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Something went wrong!');
});


