document.getElementById("start").addEventListener("click", () => {
  // Get the raw data from the textarea
  const rawData = document.getElementById("ids").value;

 // Extract the broker IDs using the extract logic
  const ids = extractBrokerIds(rawData);
  console.log(ids);
  // Send the extracted IDs to the background script for further processing
  if (ids.length > 0) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.runtime.sendMessage({ type: "processIds", ids });
    });
  } else {
    alert("No valid broker IDs found.");
  }
});

// The extract function now supports Groww and Zerodha IDs
function extractBrokerIds(data) {
  const regex = /(GROWW[a-zA-Z0-9]{11})|([a-zA-Z]{2}\d{12})/g;
  const ids = data.match(regex);
  return ids || [];
}

document.addEventListener("DOMContentLoaded", () => {
  const resultsDiv = document.getElementById("results");

  // Fetch results from chrome.storage.local
  chrome.storage.local.get("results", (data) => {
    if (data.results) {
      // Clear previous results
      resultsDiv.innerHTML = "";

      // Display each company's results
      data.results.forEach(({ company, results }, index) => {
        // Create a container for each company
        const companyContainer = document.createElement("div");
        companyContainer.classList.add("company-container");

        // Expand the first item by default
        if (index === 0) {
          companyContainer.classList.add("expanded");
        }

        // Create Header
        const companyHeader = document.createElement("div");
        companyHeader.classList.add("company-header");

        const headerTitle = document.createElement("h2");
        headerTitle.textContent = company;

        const expandIcon = document.createElement("span");
        expandIcon.classList.add("material-icons", "expand-icon");
        expandIcon.textContent = "expand_more";

        companyHeader.appendChild(headerTitle);
        companyHeader.appendChild(expandIcon);

        // Add click event to toggle expansion
        companyHeader.addEventListener("click", () => {
          companyContainer.classList.toggle("expanded");
        });

        companyContainer.appendChild(companyHeader);

        // Create Content Container
        const resultsContent = document.createElement("div");
        resultsContent.classList.add("results-content");

        // Display results for each ID under the company
        results.forEach(({ id, result }) => {
          const resultContainer = document.createElement("div");
          resultContainer.classList.add("result-container");
          resultContainer.innerHTML = `<h3>Result for ID: ${id}</h3>${result}`;
          resultsContent.appendChild(resultContainer);
        });

        companyContainer.appendChild(resultsContent);

        // Add the company's results to the main results div
        resultsDiv.appendChild(companyContainer);
      });
    } else {
      resultsDiv.innerHTML = "<p>No results found.</p>";
    }
  });

});
