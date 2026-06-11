function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async function fetchSpeciesData(species) {
    try {
      const searchUrl = `https://api.inaturalist.org/v1/taxa/autocomplete?q=${encodeURIComponent(species)}&per_page=1&rank=species`;
      const response = await fetch(searchUrl);
      if (!response.ok) throw new Error(`API request failed (status ${response.status}) for species: ${species}`);
      const data = await response.json();
      if (data.results.length === 0) return null;

      const taxon = data.results[0];
      const ancestors = Array.isArray(taxon.ancestors) ? taxon.ancestors : [];
      const observationsCount = taxon.observations_count.toLocaleString("en-US") || NA;
      
      const matchedTerm = taxon.matched_term || NA;
      const sppName = taxon.name || NA;
      const commonName = taxon.preferred_common_name;
      const idNum = taxon.id;
      const taxChanges = taxon.taxon_changes_count;
      const enteredTerm = species;

      const obsLink = `https://www.inaturalist.org/observations?taxon_id=${taxon.id}`;

      return { obsLink, name, observationsCount, matchedTerm, sppName, commonName, idNum, taxChanges, enteredTerm };
    } catch (err) {
      console.error(`Error fetching data for species "${species}": `, err);
      throw err;
    }
  }

  async function checkINaturalist() {
    const input = document.getElementById("speciesInput").value.trim();
    const speciesList = input.split("\n").map(s => s.trim()).filter(s => s.length > 0);
    const table = document.getElementById("resultsTable");
    const tbody = document.getElementById("resultsBody");

    tbody.innerHTML = "";
    if (speciesList.length === 0) {
      alert("Please enter at least one species name.");
      table.style.display = "none";
      return;
    }
    table.style.display = "table";

    for (const species of speciesList) {
      try {
        const data = await fetchSpeciesData(species);
        if (data === null) {
          tbody.innerHTML += `<tr><td colspan="6">Species not found: ${species}</td></tr>`;
        } else {
          tbody.innerHTML += `
            <tr>
              <td><a href="${data.obsLink}" target="_blank" rel="noopener noreferrer">View Observations</a></td>
              <td>${data.sppName}</td>
              <td>${data.commonName}</td>
              <td>${data.observationsCount}</td>
              <td>${data.idNum}</td>
              <td>${data.taxChanges}</td>
              <td>${data.matchedTerm}</td>
              <td>${data.enteredTerm}</td>
            </tr>`;
        }
      } catch {
        tbody.innerHTML += `<tr><td colspan="6">Error checking species: ${species}</td></tr>`;
      }

      // Pause 300ms between requests to prevent flooding API
      await sleep(300);
    }
  }