// Listen for messages from the popup script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "processIds") {
    // Query the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      // Ensure that we have at least one tab and it has an id
      if (tabs && tabs.length > 0 && tabs[0].id) {
        // Send the IDs to be processed sequentially in the active tab
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          function: processIdsSequentiallyInContent,
          args: [message.ids]  // Pass the IDs array
        });

      } else {
        console.error("Error: No active tab or tab id found.");
      }
    });
  }
});

// This function will run in the context of the web page (injected by chrome.scripting)
async function processIdsSequentiallyInContent(ids) {
  const newResults = [];

  for (const id of ids) {
    const inputField = document.getElementById("txtStat");
    const submitButton = document.getElementById("btnsearc");
    const companySelect = document.getElementById("ddlCompany"); // The select element

    // Check if inputField and submitButton exist
    if (inputField && submitButton) {
      const selectedOptionText = companySelect.options[companySelect.selectedIndex].text;
      inputField.value = id;
      submitButton.click();

      // Wait for the result to load (adjust the timeout based on how long the site takes to load results)
      await new Promise(resolve => setTimeout(resolve, 2000));

      const resultElement = document.getElementById("tbl_DetSec");

      // If the result element is found, store its HTML in the results array
      if (resultElement) {
        const resultHTML = resultElement.outerHTML;
        // Check if the company already exists in newResults
        const existingCompany = newResults.find(result => result.company === selectedOptionText);

        if (existingCompany) {
          // If company exists, add the result to the existing company
          existingCompany.results.push({ id, result: resultHTML });
        } else {
          // If company does not exist, create a new entry
          newResults.push({
            company: selectedOptionText,
            results: [{ id, result: resultHTML }]
          });
        }
      } else {
        console.warn(`Result not found for ID: ${id}`);
      }
    } else {
      console.error("Error: Input field or submit button not found.");
    }
  }

  // Once all IDs are processed, merge with existing results in chrome.storage.local
  chrome.storage.local.get("results", (data) => {
    const oldResults = data.results || [];

    // Create a map of old results for easier lookup
    const oldResultsMap = new Map(oldResults.map(item => [item.company, item]));

    // Process new results
    const finalResults = [...newResults];

    // For each new result, if it existed in old results, append the old IDs that are not in the new set
    // Actually, the requirement is "exist old also there and new brand are also store at top"
    // So we put newResults at the top.
    // If a company is in both, we should probably merge the lists of IDs.

    newResults.forEach(newCompanyData => {
      if (oldResultsMap.has(newCompanyData.company)) {
        const oldCompanyData = oldResultsMap.get(newCompanyData.company);

        // Merge results, avoiding duplicates if necessary (though IDs might be unique per run)
        // We'll append old results that aren't in the new batch
        const newIds = new Set(newCompanyData.results.map(r => r.id));
        const uniqueOldResults = oldCompanyData.results.filter(r => !newIds.has(r.id));

        newCompanyData.results.push(...uniqueOldResults);

        // Remove from map so we don't add it again later
        oldResultsMap.delete(newCompanyData.company);
      }
    });

    // Add remaining old results to the end
    oldResultsMap.forEach(value => {
      finalResults.push(value);
    });

    chrome.storage.local.set({ results: finalResults }, () => {
      console.log("Results stored in chrome.storage.local:", finalResults);
    });
  });
}

