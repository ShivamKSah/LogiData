
import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

interface DataVisualizationProps {
  data: any[];
}

export const DataVisualization = ({ data }: DataVisualizationProps) => {
  console.log("DataVisualization received data:", data);

  const chartData = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        numericFields: [],
        categoricalData: [],
        fieldSummary: {}
      };
    }

    // Get all field names from the first record
    const sampleRecord = data[0];
    const fieldNames = Object.keys(sampleRecord).filter(key => key !== 'id');
    
    console.log("Available fields:", fieldNames);

    // Categorize fields as numeric or categorical
    const numericFields: string[] = [];
    const categoricalFields: string[] = [];
    
    fieldNames.forEach(field => {
      const values = data.map(item => item[field]).filter(val => val !== undefined && val !== null && val !== '');
      const numericValues = values.filter(val => !isNaN(Number(val)) && val !== '');
      
      if (numericValues.length > values.length * 0.5) {
        numericFields.push(field);
      } else {
        categoricalFields.push(field);
      }
    });

    console.log("Numeric fields:", numericFields);
    console.log("Categorical fields:", categoricalFields);

    // Create visualizations for categorical data
    const categoricalData = categoricalFields.map(field => {
      const distribution = data.reduce((acc: any, item: any) => {
        const value = item[field];
        if (value !== undefined && value !== null && value !== '') {
          acc[value] = (acc[value] || 0) + 1;
        }
        return acc;
      }, {});

      return {
        field,
        data: Object.entries(distribution)
          .map(([key, count]) => ({ name: key, value: count }))
          .sort((a, b) => (b.value as number) - (a.value as number))
          .slice(0, 10) // Top 10 values
      };
    });

    // Create summary statistics
    const fieldSummary = numericFields.reduce((acc: any, field) => {
      const values = data
        .map(item => Number(item[field]))
        .filter(val => !isNaN(val));
      
      if (values.length > 0) {
        acc[field] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((sum, val) => sum + val, 0) / values.length,
          count: values.length
        };
      }
      return acc;
    }, {});

    return {
      numericFields,
      categoricalData,
      fieldSummary
    };
  }, [data]);

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#ff7c7c'];

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No data available for visualization. Upload some CSV data to see charts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900">Total Records</h4>
          <p className="text-2xl font-bold text-blue-600">{data.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h4 className="font-medium text-green-900">Numeric Fields</h4>
          <p className="text-2xl font-bold text-green-600">{chartData.numericFields.length}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <h4 className="font-medium text-purple-900">Categorical Fields</h4>
          <p className="text-2xl font-bold text-purple-600">{chartData.categoricalData.length}</p>
        </div>
      </div>

      {/* Numeric Field Statistics */}
      {chartData.numericFields.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4">Numeric Field Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {chartData.numericFields.map(field => {
              const stats = chartData.fieldSummary[field];
              return (
                <div key={field} className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2 capitalize">{field}</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Min:</span>
                      <span className="font-medium">{stats.min.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Max:</span>
                      <span className="font-medium">{stats.max.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Avg:</span>
                      <span className="font-medium">{stats.avg.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Count:</span>
                      <span className="font-medium">{stats.count}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Categorical Data Visualizations */}
      {chartData.categoricalData.map((categoryData, index) => (
        <div key={categoryData.field}>
          <h3 className="text-lg font-medium mb-4 capitalize">
            {categoryData.field} Distribution
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Bar Chart */}
            <div>
              <h4 className="text-md font-medium mb-2">Bar Chart</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    fontSize={12}
                  />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill={COLORS[index % COLORS.length]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div>
              <h4 className="text-md font-medium mb-2">Pie Chart</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData.data}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.data.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ))}

      {/* Numeric Data Line Chart (if applicable) */}
      {chartData.numericFields.length > 0 && (
        <div>
          <h3 className="text-lg font-medium mb-4">Numeric Data Trends</h3>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={data.slice(0, 50)}> {/* Limit to first 50 records for readability */}
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="id" />
              <YAxis />
              <Tooltip />
              {chartData.numericFields.slice(0, 3).map((field, index) => (
                <Line
                  key={field}
                  type="monotone"
                  dataKey={field}
                  stroke={COLORS[index]}
                  strokeWidth={2}
                  name={field}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
