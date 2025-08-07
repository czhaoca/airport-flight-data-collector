# Flight Data Analysis Notebooks

This directory contains Jupyter notebooks for analyzing flight data collected by the Airport Flight Data Collector system.

## Setup

### 1. Install Requirements

```bash
# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install required packages
pip install -r requirements.txt
```

### 2. Configure API Access

Create a `.env` file in the notebooks directory:

```env
API_BASE_URL=http://localhost:3001/api/v2
API_TOKEN=your-api-token-here
```

### 3. Start Jupyter

```bash
# Start Jupyter Lab (recommended)
jupyter lab

# Or classic Jupyter Notebook
jupyter notebook
```

## Available Notebooks

### 1. `flight_data_analysis.ipynb`
Comprehensive flight data analysis including:
- Data fetching from API
- Flight volume analysis
- Delay pattern analysis
- Airline performance comparison
- Seasonality detection
- Forecasting
- Data export

### 2. `advanced_analytics.ipynb` (Coming Soon)
Advanced analytics featuring:
- Machine learning models
- Anomaly detection
- Route optimization
- Predictive maintenance

### 3. `real_time_monitoring.ipynb` (Coming Soon)
Real-time monitoring dashboard:
- Live flight tracking
- WebSocket connections
- Alert management
- Performance metrics

## Usage Examples

### Basic Data Loading

```python
import pandas as pd
import requests

# Load flight data
API_URL = "http://localhost:3001/api/v2"
response = requests.get(f"{API_URL}/flights", 
                        params={"airport": "SFO", "limit": 1000})
flights = pd.DataFrame(response.json()['data'])
```

### Visualization

```python
import matplotlib.pyplot as plt
import seaborn as sns

# Plot delay distribution
plt.figure(figsize=(10, 6))
sns.histplot(flights['delayMinutes'], bins=30)
plt.xlabel('Delay (minutes)')
plt.title('Flight Delay Distribution')
plt.show()
```

### Advanced Analytics

```python
# Get predictions
response = requests.get(f"{API_URL}/analytics/forecasts",
                        params={"airports": "SFO,YYZ,YVR"})
forecasts = response.json()['data']
```

## Data Export Formats

The notebooks support exporting analysis results in multiple formats:

- **CSV**: For spreadsheet applications
- **Parquet**: For efficient storage and big data processing
- **JSON**: For web applications and APIs
- **Excel**: For business reporting

## Tips

1. **API Rate Limiting**: The API has rate limits. Use caching when developing notebooks.

2. **Large Datasets**: For large datasets, use chunking:
```python
chunk_size = 1000
for chunk in pd.read_csv('large_file.csv', chunksize=chunk_size):
    process(chunk)
```

3. **Memory Management**: Clear variables when done:
```python
del large_dataframe
import gc
gc.collect()
```

4. **Parallel Processing**: Use multiprocessing for heavy computations:
```python
from multiprocessing import Pool
with Pool(4) as p:
    results = p.map(analyze_airport, airports)
```

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure all packages are installed: `pip install -r requirements.txt`

2. **API Connection Failed**: 
   - Check if API server is running
   - Verify API_BASE_URL in .env file
   - Check network connectivity

3. **Memory Errors**: 
   - Reduce data size with filtering
   - Use data types efficiently: `pd.to_numeric(df['col'], downcast='integer')`

4. **Slow Performance**:
   - Use vectorized operations instead of loops
   - Cache API responses
   - Consider using Dask for very large datasets

## Contributing

To add new notebooks:

1. Create descriptive notebook names
2. Include markdown documentation
3. Add example outputs
4. Test with sample data
5. Update this README

## Resources

- [Pandas Documentation](https://pandas.pydata.org/docs/)
- [Matplotlib Gallery](https://matplotlib.org/stable/gallery/index.html)
- [Seaborn Tutorial](https://seaborn.pydata.org/tutorial.html)
- [Jupyter Documentation](https://jupyter.org/documentation)

## License

MIT License - See main project LICENSE file