'use client';

import { useSession, signOut } from 'next-auth/react';
import { useState } from 'react';

export default function TestAuthPage() {
  const { data: session, status } = useSession();
  const [authStatus, setAuthStatus] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth-status');
      const data = await response.json();
      setAuthStatus(data);
    } catch (error) {
      console.error('Error checking auth status:', error);
      setAuthStatus({ error: 'Failed to check auth status' });
    }
  };

  const testGoogleDocs = async () => {
    try {
      setTestResult({ loading: true });
      
      // Test with a sample document ID - you'll need to replace this with a real one
      const response = await fetch('/api/fetch-docs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: 'test-doc-id' // Replace with real document ID
        }),
      });

      const data = await response.json();
      setTestResult(data);
    } catch (error) {
      console.error('Error testing Google Docs:', error);
      setTestResult({ error: 'Failed to test Google Docs access' });
    }
  };

  if (status === 'loading') {
    return <div className="p-8">Loading...</div>;
  }

  if (!session) {
    return (
      <div className="p-8">
        <h1 className="text-2xl mb-4">Not authenticated</h1>
        <a
          href="/api/auth/signin/google"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Sign in with Google
        </a>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Google Authentication Test</h1>
        <button
          onClick={() => signOut()}
          className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded">
          <h2 className="text-lg font-semibold mb-2">Session Info</h2>
          <pre className="text-sm overflow-auto">
            {JSON.stringify(session, null, 2)}
          </pre>
        </div>

        <div className="space-y-4">
          <button
            onClick={checkAuthStatus}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Check Auth Status
          </button>

          {authStatus && (
            <div className="bg-gray-100 p-4 rounded">
              <h3 className="font-semibold mb-2">Auth Status Result</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(authStatus, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <button
            onClick={testGoogleDocs}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Test Google Docs Access
          </button>

          {testResult && (
            <div className="bg-gray-100 p-4 rounded">
              <h3 className="font-semibold mb-2">Google Docs Test Result</h3>
              <pre className="text-sm overflow-auto">
                {JSON.stringify(testResult, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-yellow-100 p-4 rounded">
          <h3 className="font-semibold mb-2">Instructions</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>First, click "Check Auth Status" to see if your Google access token is properly stored</li>
            <li>If the token is missing, you may need to sign out and sign back in to re-authorize</li>
            <li>To test actual Google Docs access, you need to replace the test document ID with a real one</li>
            <li>Make sure the document is accessible to your Google account</li>
          </ol>
        </div>
      </div>
    </div>
  );
}