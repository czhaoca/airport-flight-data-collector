const MAX_SIZE = 100 * 1024 * 1024; // 100MB

function truncateData(data, folderName, date, pushToGitHub) {
  let batches = [];
  let currentBatch = [];
  let currentSize = 0;
  let batchNumber = 1;

  for (const item of data) {
    const itemSize = JSON.stringify(item).length;
    if (currentSize + itemSize > MAX_SIZE) {
      // Current batch is full, push it and start a new one
      batches.push(currentBatch);
      currentBatch = [item];
      currentSize = itemSize;
      batchNumber++;
    } else {
      currentBatch.push(item);
      currentSize += itemSize;
    }
  }

  // Push the last batch if it's not empty
  if (currentBatch.length > 0) {
    batches.push(currentBatch);
  }

  // Upload each batch
  batches.forEach((batch, index) => {
    const batchData = {
      batchNumber: index + 1,
      totalBatches: batches.length,
      data: batch
    };
    const batchFileName = `${folderName}-batch-${index + 1}`;
    pushToGitHub(batchData, date, batchFileName);
  });

  console.log(`Data truncated into ${batches.length} batches.`);
  return batches.length;
}

module.exports = { truncateData };