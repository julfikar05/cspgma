Project Management & Tool for Team SAP
Table of Contents

Description
Installation
Usage
Contributing
License
Contact

Description
This is a web application designed to manage projects and provide tools for Team SAP. It includes:

A frontend built with React for a dynamic and user-friendly interface.
A backend using Node.js and Express, integrated with an Oracle database for robust data management.

The project is organized into two main directories: backend and frontend, ensuring a clear separation of client-side and server-side logic.
Installation
Prerequisites

Node.js (version 14 or higher): Required for both frontend and backend development.
Oracle Instant Client: Necessary for the backend to connect to the Oracle database. Download from Oracle's official site.

Steps

Clone the repository:
git clone https://github.com/julfikar05/cspgma.git


Navigate to the project directory:
cd cspgma


Install dependencies for the backend:
cd backend
npm install


Install dependencies for the frontend:
cd ../frontend
npm install


Set up environment variables for the database connection in backend/.env:
ORACLE_USER=your_username
ORACLE_PASSWORD=your_password
ORACLE_CONNECTION_STRING=your_connection_string


Replace your_username, your_password, and your_connection_string with your actual Oracle database credentials.



Usage
Running the Backend

Navigate to the backend directory:
cd backend


Start the server:
node app.js


Alternatively, if a start script is defined in backend/package.json, use:npm start



The backend server will be accessible at http://localhost:5000. API endpoints are available under /api/*.


Running the Frontend

Navigate to the frontend directory:
cd ../frontend


Start the React development server:
npm start

The frontend will be accessible at http://localhost:3000.


Notes

Ensure the backend is running before starting the frontend, as the frontend may rely on API calls to the backend.
The frontend is configured to connect to the backend at http://localhost:5000 by default.

Contributing
Contributions are welcome! To contribute:

Fork the repository.
Create a feature branch for your changes.
Submit a pull request with a clear description of your contributions.

Please ensure your code follows the project's coding standards and includes appropriate documentation.
License
This project is licensed under the MIT License.
Contact
For questions or feedback, please contact julfikar05.
