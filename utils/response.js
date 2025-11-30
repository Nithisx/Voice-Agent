// Utility function to format responses for voice controller
export default function formatResponse() {
  return {
    json: (data) => data,
    status: (code) => ({
      json: (data) => ({ ...data, statusCode: code }),
    }),
  };
}
