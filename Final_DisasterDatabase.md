# Database Creation



Enter password: \*\*\*\*

Welcome to the MySQL monitor.  Commands end with ; or \\g.

Your MySQL connection id is 8

Server version: 8.0.45 MySQL Community Server - GPL



Copyright (c) 2000, 2026, Oracle and/or its affiliates.



Oracle is a registered trademark of Oracle Corporation and/or its

affiliates. Other names may be trademarks of their respective

owners.



Type 'help;' or '\\h' for help. Type '\\c' to clear the current input statement.



mysql> CREATE DATABASE disaster\_relief\_db\_final;

Query OK, 1 row affected (0.03 sec)



mysql> USE disaster\_relief\_db\_final;

Database changed

mysql> CREATE TABLE Disaster (

&#x20;   ->     disaster\_id INT AUTO\_INCREMENT PRIMARY KEY,

&#x20;   ->     disaster\_type VARCHAR(50),

&#x20;   ->     severity\_level ENUM('LOW','MEDIUM','HIGH','CRITICAL'),

&#x20;   ->     start\_date DATE,

&#x20;   ->     created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP

&#x20;   -> );

Query OK, 0 rows affected (0.13 sec)



mysql> CREATE TABLE Affected\_Area (

&#x20;   ->     area\_id INT AUTO\_INCREMENT PRIMARY KEY,

&#x20;   ->     area\_name VARCHAR(100),

&#x20;   ->     population\_affected INT,

&#x20;   ->     priority\_level ENUM('LOW','MEDIUM','HIGH'),

&#x20;   ->     disaster\_id INT,

&#x20;   ->     created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,

&#x20;   ->     FOREIGN KEY (disaster\_id) REFERENCES Disaster(disaster\_id)

&#x20;   -> );

Query OK, 0 rows affected (0.05 sec)



mysql> CREATE TABLE Central\_Inventory (

&#x20;   ->     inventory\_id INT AUTO\_INCREMENT PRIMARY KEY,

&#x20;   ->     name VARCHAR(100),

&#x20;   ->     location VARCHAR(100),

&#x20;   ->     total\_capacity INT,

&#x20;   ->     created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP

&#x20;   -> );

Query OK, 0 rows affected (0.02 sec)



mysql> CREATE TABLE Relief\_Camp (

&#x20;   ->     camp\_id INT AUTO\_INCREMENT PRIMARY KEY,

&#x20;   ->     name VARCHAR(100),

&#x20;   ->     location VARCHAR(100),

&#x20;   ->     capacity INT,

&#x20;   ->     area\_id INT,

&#x20;   ->     inventory\_id INT,

&#x20;   ->     created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,

&#x20;   ->     FOREIGN KEY (area\_id) REFERENCES Affected\_Area(area\_id),

&#x20;   ->     FOREIGN KEY (inventory\_id) REFERENCES Central\_Inventory(inventory\_id)

&#x20;   -> );

Query OK, 0 rows affected (0.04 sec)



mysql> CREATE TABLE Resource (

&#x20;   ->     resource\_id INT AUTO\_INCREMENT PRIMARY KEY,

&#x20;   ->     resource\_name VARCHAR(100),

&#x20;   ->     unit VARCHAR(20)

&#x20;   -> );

Query OK, 0 rows affected (0.02 sec)



mysql> CREATE TABLE Supplier (

&#x20;   ->     supplier\_id INT AUTO\_INCREMENT PRIMARY KEY,

&#x20;   ->     supplier\_name VARCHAR(100),

&#x20;   ->     contact\_info VARCHAR(100)

&#x20;   -> );

Query OK, 0 rows affected (0.03 sec)



mysql> CREATE TABLE Inventory\_Stock (

&#x20;   ->     inv\_stock\_id INT AUTO\_INCREMENT PRIMARY KEY,

&#x20;   ->     inventory\_id INT,

&#x20;   ->     resource\_id INT,

&#x20;   ->     quantity\_available INT DEFAULT 0,

&#x20;   ->     minimum\_threshold INT DEFAULT 0,

&#x20;   ->     FOREIGN KEY (inventory\_id) REFERENCES Central\_Inventory(inventory\_id),

&#x20;   ->     FOREIGN KEY (resource\_id) REFERENCES Resource(resource\_id),

&#x20;   ->     UNIQUE (inventory\_id, resource\_id)

&#x20;   -> );

Query OK, 0 rows affected (0.05 sec)



mysql> CREATE TABLE Camp\_Stock (

&#x20;   ->     stock\_id INT AUTO\_INCREMENT PRIMARY KEY,

&#x20;   ->     camp\_id INT,

&#x20;   ->     resource\_id INT,

&#x20;   ->     quantity\_available INT DEFAULT 0,

&#x20;   ->     FOREIGN KEY (camp\_id) REFERENCES Relief\_Camp(camp\_id),

&#x20;   ->     FOREIGN KEY (resource\_id) REFERENCES Resource(resource\_id),

&#x20;   ->     UNIQUE (camp\_id, resource\_id)

&#x20;   -> );

Query OK, 0 rows affected (0.05 sec)



mysql> CREATE TABLE Supply (

&#x20;   ->     supply\_id INT AUTO\_INCREMENT PRIMARY KEY,

&#x20;   ->     supplier\_id INT,

&#x20;   ->     inventory\_id INT,

&#x20;   ->     resource\_id INT,

&#x20;   ->     quantity\_supplied INT,

&#x20;   ->     supply\_date DATE,

&#x20;   ->     created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,

&#x20;   ->     FOREIGN KEY (supplier\_id) REFERENCES Supplier(supplier\_id),

&#x20;   ->     FOREIGN KEY (inventory\_id) REFERENCES Central\_Inventory(inventory\_id),

&#x20;   ->     FOREIGN KEY (resource\_id) REFERENCES Resource(resource\_id)

&#x20;   -> );

Query OK, 0 rows affected (0.04 sec)



mysql> CREATE TABLE Resource\_Request (

&#x20;   ->     request\_id INT AUTO\_INCREMENT PRIMARY KEY,

&#x20;   ->     camp\_id INT,

&#x20;   ->     resource\_id INT,

&#x20;   ->     quantity\_required INT,

&#x20;   ->     priority\_level ENUM('LOW','MEDIUM','HIGH'),

&#x20;   ->     status ENUM('PENDING','PARTIAL','COMPLETED') DEFAULT 'PENDING',

&#x20;   ->     request\_date DATE,

&#x20;   ->     created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,

&#x20;   ->     FOREIGN KEY (camp\_id) REFERENCES Relief\_Camp(camp\_id),

&#x20;   ->     FOREIGN KEY (resource\_id) REFERENCES Resource(resource\_id)

&#x20;   -> );

Query OK, 0 rows affected (0.05 sec)



mysql> CREATE TABLE Request\_Fulfillment (

&#x20;   ->     fulfillment\_id INT AUTO\_INCREMENT PRIMARY KEY,

&#x20;   ->     request\_id INT,

&#x20;   ->     quantity\_supplied INT,

&#x20;   ->     fulfillment\_date DATE,

&#x20;   ->     fulfillment\_status ENUM('PARTIAL','COMPLETED'),

&#x20;   ->     created\_at TIMESTAMP DEFAULT CURRENT\_TIMESTAMP,

&#x20;   ->     FOREIGN KEY (request\_id) REFERENCES Resource\_Request(request\_id)

&#x20;   -> );

Query OK, 0 rows affected (0.04 sec)



mysql> show tables;

+------------------------------------+

| Tables\_in\_disaster\_relief\_db\_final |

+------------------------------------+

| affected\_area                      |

| camp\_stock                         |

| central\_inventory                  |

| disaster                           |

| inventory\_stock                    |

| relief\_camp                        |

| request\_fulfillment                |

| resource                           |

| resource\_request                   |

| supplier                           |

| supply                             |

+------------------------------------+

11 rows in set (0.07 sec)



mysql> desc affected\_area;

+---------------------+-----------------------------+------+-----+-------------------+-------------------+

| Field               | Type                        | Null | Key | Default           | Extra             |

+---------------------+-----------------------------+------+-----+-------------------+-------------------+

| area\_id             | int                         | NO   | PRI | NULL              | auto\_increment    |

| area\_name           | varchar(100)                | YES  |     | NULL              |                   |

| population\_affected | int                         | YES  |     | NULL              |                   |

| priority\_level      | enum('LOW','MEDIUM','HIGH') | YES  |     | NULL              |                   |

| disaster\_id         | int                         | YES  | MUL | NULL              |                   |

| created\_at          | timestamp                   | YES  |     | CURRENT\_TIMESTAMP | DEFAULT\_GENERATED |

+---------------------+-----------------------------+------+-----+-------------------+-------------------+

6 rows in set (0.01 sec)



mysql> desc camp\_stock;

+--------------------+------+------+-----+---------+----------------+

| Field              | Type | Null | Key | Default | Extra          |

+--------------------+------+------+-----+---------+----------------+

| stock\_id           | int  | NO   | PRI | NULL    | auto\_increment |

| camp\_id            | int  | YES  | MUL | NULL    |                |

| resource\_id        | int  | YES  | MUL | NULL    |                |

| quantity\_available | int  | YES  |     | 0       |                |

+--------------------+------+------+-----+---------+----------------+

4 rows in set (0.00 sec)



mysql> desc central\_inventory;

+----------------+--------------+------+-----+-------------------+-------------------+

| Field          | Type         | Null | Key | Default           | Extra             |

+----------------+--------------+------+-----+-------------------+-------------------+

| inventory\_id   | int          | NO   | PRI | NULL              | auto\_increment    |

| name           | varchar(100) | YES  |     | NULL              |                   |

| location       | varchar(100) | YES  |     | NULL              |                   |

| total\_capacity | int          | YES  |     | NULL              |                   |

| created\_at     | timestamp    | YES  |     | CURRENT\_TIMESTAMP | DEFAULT\_GENERATED |

+----------------+--------------+------+-----+-------------------+-------------------+

5 rows in set (0.00 sec)



mysql> desc disaster;

+----------------+----------------------------------------+------+-----+-------------------+-------------------+

| Field          | Type                                   | Null | Key | Default           | Extra             |

+----------------+----------------------------------------+------+-----+-------------------+-------------------+

| disaster\_id    | int                                    | NO   | PRI | NULL              | auto\_increment    |

| disaster\_type  | varchar(50)                            | YES  |     | NULL              |                   |

| severity\_level | enum('LOW','MEDIUM','HIGH','CRITICAL') | YES  |     | NULL              |                   |

| start\_date     | date                                   | YES  |     | NULL              |                   |

| created\_at     | timestamp                              | YES  |     | CURRENT\_TIMESTAMP | DEFAULT\_GENERATED |

+----------------+----------------------------------------+------+-----+-------------------+-------------------+

5 rows in set (0.01 sec)



mysql> desc inventory\_stock;

+--------------------+------+------+-----+---------+----------------+

| Field              | Type | Null | Key | Default | Extra          |

+--------------------+------+------+-----+---------+----------------+

| inv\_stock\_id       | int  | NO   | PRI | NULL    | auto\_increment |

| inventory\_id       | int  | YES  | MUL | NULL    |                |

| resource\_id        | int  | YES  | MUL | NULL    |                |

| quantity\_available | int  | YES  |     | 0       |                |

| minimum\_threshold  | int  | YES  |     | 0       |                |

+--------------------+------+------+-----+---------+----------------+

5 rows in set (0.00 sec)



mysql> desc relief\_camp;

+--------------+--------------+------+-----+-------------------+-------------------+

| Field        | Type         | Null | Key | Default           | Extra             |

+--------------+--------------+------+-----+-------------------+-------------------+

| camp\_id      | int          | NO   | PRI | NULL              | auto\_increment    |

| name         | varchar(100) | YES  |     | NULL              |                   |

| location     | varchar(100) | YES  |     | NULL              |                   |

| capacity     | int          | YES  |     | NULL              |                   |

| area\_id      | int          | YES  | MUL | NULL              |                   |

| inventory\_id | int          | YES  | MUL | NULL              |                   |

| created\_at   | timestamp    | YES  |     | CURRENT\_TIMESTAMP | DEFAULT\_GENERATED |

+--------------+--------------+------+-----+-------------------+-------------------+

7 rows in set (0.00 sec)



mysql> desc request\_fulfillment;

+--------------------+-----------------------------+------+-----+-------------------+-------------------+

| Field              | Type                        | Null | Key | Default           | Extra             |

+--------------------+-----------------------------+------+-----+-------------------+-------------------+

| fulfillment\_id     | int                         | NO   | PRI | NULL              | auto\_increment    |

| request\_id         | int                         | YES  | MUL | NULL              |                   |

| quantity\_supplied  | int                         | YES  |     | NULL              |                   |

| fulfillment\_date   | date                        | YES  |     | NULL              |                   |

| fulfillment\_status | enum('PARTIAL','COMPLETED') | YES  |     | NULL              |                   |

| created\_at         | timestamp                   | YES  |     | CURRENT\_TIMESTAMP | DEFAULT\_GENERATED |

+--------------------+-----------------------------+------+-----+-------------------+-------------------+

6 rows in set (0.00 sec)



mysql> desc resource;

+---------------+--------------+------+-----+---------+----------------+

| Field         | Type         | Null | Key | Default | Extra          |

+---------------+--------------+------+-----+---------+----------------+

| resource\_id   | int          | NO   | PRI | NULL    | auto\_increment |

| resource\_name | varchar(100) | YES  |     | NULL    |                |

| unit          | varchar(20)  | YES  |     | NULL    |                |

+---------------+--------------+------+-----+---------+----------------+

3 rows in set (0.00 sec)



mysql> desc resource\_request;

+-------------------+---------------------------------------+------+-----+-------------------+-------------------+

| Field             | Type                                  | Null | Key | Default           | Extra             |

+-------------------+---------------------------------------+------+-----+-------------------+-------------------+

| request\_id        | int                                   | NO   | PRI | NULL              | auto\_increment    |

| camp\_id           | int                                   | YES  | MUL | NULL              |                   |

| resource\_id       | int                                   | YES  | MUL | NULL              |                   |

| quantity\_required | int                                   | YES  |     | NULL              |                   |

| priority\_level    | enum('LOW','MEDIUM','HIGH')           | YES  |     | NULL              |                   |

| status            | enum('PENDING','PARTIAL','COMPLETED') | YES  |     | PENDING           |                   |

| request\_date      | date                                  | YES  |     | NULL              |                   |

| created\_at        | timestamp                             | YES  |     | CURRENT\_TIMESTAMP | DEFAULT\_GENERATED |

+-------------------+---------------------------------------+------+-----+-------------------+-------------------+

8 rows in set (0.00 sec)



mysql> desc supplier;

+---------------+--------------+------+-----+---------+----------------+

| Field         | Type         | Null | Key | Default | Extra          |

+---------------+--------------+------+-----+---------+----------------+

| supplier\_id   | int          | NO   | PRI | NULL    | auto\_increment |

| supplier\_name | varchar(100) | YES  |     | NULL    |                |

| contact\_info  | varchar(100) | YES  |     | NULL    |                |

+---------------+--------------+------+-----+---------+----------------+

3 rows in set (0.01 sec)



mysql> desc supply;

+-------------------+-----------+------+-----+-------------------+-------------------+

| Field             | Type      | Null | Key | Default           | Extra             |

+-------------------+-----------+------+-----+-------------------+-------------------+

| supply\_id         | int       | NO   | PRI | NULL              | auto\_increment    |

| supplier\_id       | int       | YES  | MUL | NULL              |                   |

| inventory\_id      | int       | YES  | MUL | NULL              |                   |

| resource\_id       | int       | YES  | MUL | NULL              |                   |

| quantity\_supplied | int       | YES  |     | NULL              |                   |

| supply\_date       | date      | YES  |     | NULL              |                   |

| created\_at        | timestamp | YES  |     | CURRENT\_TIMESTAMP | DEFAULT\_GENERATED |

+-------------------+-----------+------+-----+-------------------+-------------------+

7 rows in set (0.00 sec)



# 

# Intial Database Insertion



Enter password: \*\*\*\*

Welcome to the MySQL monitor.  Commands end with ; or \\g.

Your MySQL connection id is 12

Server version: 8.0.45 MySQL Community Server - GPL



Copyright (c) 2000, 2026, Oracle and/or its affiliates.



Oracle is a registered trademark of Oracle Corporation and/or its

affiliates. Other names may be trademarks of their respective

owners.



Type 'help;' or '\\h' for help. Type '\\c' to clear the current input statement.



mysql> show databases

&#x20;   -> ;

+--------------------------+

| Database                 |

+--------------------------+

| assign1                  |

| disaster\_relief\_db       |

| disaster\_relief\_db\_final |

| information\_schema       |

| library                  |

| mysql                    |

| performance\_schema       |

| sakila                   |

| sys                      |

| world                    |

+--------------------------+

10 rows in set (0.13 sec)



mysql> use disaster\_relief\_db\_final;

Database changed

mysql> INSERT INTO resource (resource\_name, unit)

&#x20;   -> VALUES

&#x20;   -> ('Water Bottles', 'units'),

&#x20;   -> ('Meal Kits', 'units'),

&#x20;   -> ('First Aid Kits', 'kits'),

&#x20;   -> ('Thermal Blankets', 'units'),

&#x20;   -> ('LED Torches', 'units'),

&#x20;   -> ('Wheelchairs', 'units');

Query OK, 6 rows affected (0.17 sec)

Records: 6  Duplicates: 0  Warnings: 0



mysql> desc central\_inventory;

+----------------+--------------+------+-----+-------------------+-------------------+

| Field          | Type         | Null | Key | Default           | Extra             |

+----------------+--------------+------+-----+-------------------+-------------------+

| inventory\_id   | int          | NO   | PRI | NULL              | auto\_increment    |

| name           | varchar(100) | YES  |     | NULL              |                   |

| location       | varchar(100) | YES  |     | NULL              |                   |

| total\_capacity | int          | YES  |     | NULL              |                   |

| created\_at     | timestamp    | YES  |     | CURRENT\_TIMESTAMP | DEFAULT\_GENERATED |

+----------------+--------------+------+-----+-------------------+-------------------+

5 rows in set (0.04 sec)



mysql> INSERT INTO central\_inventory (name, location, total\_capacity) VALUES

&#x20;   -> ('Pune Relief Hub', 'Pune', 8000);

Query OK, 1 row affected (0.01 sec)



mysql> desc supplier;

+---------------+--------------+------+-----+---------+----------------+

| Field         | Type         | Null | Key | Default | Extra          |

+---------------+--------------+------+-----+---------+----------------+

| supplier\_id   | int          | NO   | PRI | NULL    | auto\_increment |

| supplier\_name | varchar(100) | YES  |     | NULL    |                |

| contact\_info  | varchar(100) | YES  |     | NULL    |                |

+---------------+--------------+------+-----+---------+----------------+

3 rows in set (0.00 sec)



mysql> INSERT INTO supplier (supplier\_name, contact\_info) VALUES

&#x20;   -> ('Birla Relief Supplies', '9876543210');

Query OK, 1 row affected (0.01 sec)



mysql> select \* from resource;

+-------------+------------------+-------+

| resource\_id | resource\_name    | unit  |

+-------------+------------------+-------+

|           1 | Water Bottles    | units |

|           2 | Meal Kits        | units |

|           3 | First Aid Kits   | kits  |

|           4 | Thermal Blankets | units |

|           5 | LED Torches      | units |

|           6 | Wheelchairs      | units |

+-------------+------------------+-------+

6 rows in set (0.00 sec)



mysql> select \* from central\_inventory;

+--------------+-----------------+----------+----------------+---------------------+

| inventory\_id | name            | location | total\_capacity | created\_at          |

+--------------+-----------------+----------+----------------+---------------------+

|            1 | Pune Relief Hub | Pune     |           8000 | 2026-04-08 18:18:50 |

+--------------+-----------------+----------+----------------+---------------------+

1 row in set (0.01 sec)



mysql> select \* from supplier;

+-------------+-----------------------+--------------+

| supplier\_id | supplier\_name         | contact\_info |

+-------------+-----------------------+--------------+

|           1 | Birla Relief Supplies | 9876543210   |

+-------------+-----------------------+--------------+

1 row in set (0.00 sec)



mysql>