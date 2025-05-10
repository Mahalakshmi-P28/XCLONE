import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";


const SearchPage = () => {
	const [query, setQuery] = useState("");
	const [results, setResults] = useState([]);
	const navigate = useNavigate();

	const handleSearchChange = (e) => {
		setQuery(e.target.value);
	};

	const handleSubmit = (e) => {
		e.preventDefault();
		if(query.trim()) {
			const matchedUser = results.find(
				(user) =>
					 user.username.toLowerCase() === query.trim().toLowerCase() ||
				     user.fullName.toLowerCase() === query.trim().toLowerCase()
			);
			if(matchedUser) {
				navigate(`/profile/${matchedUser.username}`);
			} else {
				setResults(results);
			}
		}
	};

	useEffect(() => {
		
		const fetchResults = async () => {
		  if (query.trim()) {
			try {
			  const response = await fetch(`/api/users/search?query=${query.trim()}`);
			  if(response.ok) {
				const data = await response.json();
				setResults(data);
			  } else {
				console.log("Error fetching search results:", response.statusText);
				setResults([]);
			  }
			} catch (error) {
			  console.log("Error fetching search results:", error);
			  setResults([]);
			}
		  } else {
			setResults([]); 
		  }
		};
	
		fetchResults();
	  }, [query]); 

	return (
		<div className='p-4 w-full'>
			<form onSubmit={handleSubmit} className='flex gap-2 max-w-md mx-auto'>
				<input
					type='text'
					placeholder='Enter username or full name'
					value={query}
					onChange={handleSearchChange}
					className='input input-bordered w-full bg-[#121212] text-white'
				/>
				<button type='submit' className='btn btn-primary'>Go</button>
			</form>
			
			{/* Show results when query is not empty */}
			{results.length > 0 && query.trim() && (
				<div className="mt-4">
				{results.map((user) => (
					<div
					key={user._id}
					className="p-2 hover:bg-gray-700 cursor-pointer"
					onClick={() => navigate(`/profile/${user.username}`)} // Navigate on click
					>
					<p>
						{user.fullName} ({user.username})
					</p>
					</div>
				))}
				</div>
			)}

			{/* Display "No results found" when no users are found */}
			{query.trim() && results.length === 0 && (
				<div className="mt-4 text-white">No users found</div>
			)}
		</div>
	);
};

export default SearchPage;
