// Import React hooks from the React library.
// - useState: lets us store and update component data.
// - useEffect: lets us run code when the component loads.
import { useEffect, useState } from "react";

function App() {
  // Create a piece of state called "message".
  // It will hold the response text from the backend.
  // Initially, it's an empty string ("").
  const [message, setMessage] = useState("");

  // This useEffect runs *once*, when the component is first rendered.
  // It sends a GET request to our backend server.
  useEffect(() => {
    // The API URL is loaded from the frontend .env file
    // Example: axios.get("http://localhost:3000/")
    fetch(`${process.env.REACT_APP_API_URL}/`)
      // Convert the server's response from JSON → JavaScript object
      .then(res => res.json())
      // Once we get the data, update the "message" state with the value returned
      .then(data => setMessage(data.message))
      // Optional: If there's an error (like server not running), log it
      .catch(err => console.error("Error fetching message:", err));
  }, []); 
  // Empty dependency array [] → means this code runs ONLY once (on page load)

  return (
    <div>
      {/* Display the message we got from the backend */}
      <h1>{message}</h1>
    </div>
  );
}

// Export the component so App.js can be used by index.js or other files
export default App;
