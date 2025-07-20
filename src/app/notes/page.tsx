import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

async function addPrd(formData: FormData) {
  'use server'
  
  const supabase = await createClient();
  
  const driveLink = formData.get('drive-link') as string;
  const v0Link = formData.get('v0-link') as string;
  const user = formData.get('user') as string;
  const shipped = formData.get('shipped') === 'on';
  
  const { error } = await supabase
    .from('prds')
    .insert([
      {
        'drive-link': driveLink,
        'v0-link': v0Link,
        'user': user,
        'shipped': shipped
      }
    ]);
  
  if (error) {
    console.error('Error inserting PRD:', error);
  }
  
  redirect('/notes');
}

export default async function Notes() {
  const supabase = await createClient();

  const { data: prds } = await supabase
    .from('prds')
    .select('*')
  
  console.log('test', prds)
  
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">PRDs Database</h1>
      
      {/* Add new PRD form */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">Add New PRD</h2>
        <form action={addPrd} className="space-y-4">
          <div>
            <label htmlFor="drive-link" className="block text-sm font-medium text-gray-700 mb-1">
              Drive Link
            </label>
            <input
              type="text"
              id="drive-link"
              name="drive-link"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://drive.google.com/..."
            />
          </div>
          
          <div>
            <label htmlFor="v0-link" className="block text-sm font-medium text-gray-700 mb-1">
              V0 Link
            </label>
            <input
              type="text"
              id="v0-link"
              name="v0-link"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://v0.dev/..."
            />
          </div>
          
          <div>
            <label htmlFor="user" className="block text-sm font-medium text-gray-700 mb-1">
              User Email
            </label>
            <input
              type="email"
              id="user"
              name="user"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="user@klaviyo.com"
            />
          </div>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="shipped"
              name="shipped"
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="shipped" className="ml-2 block text-sm text-gray-700">
              Shipped
            </label>
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
          >
            Add PRD
          </button>
        </form>
      </div>
      
      {/* Display existing PRDs */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Existing PRDs</h2>
        <pre className="bg-white p-4 rounded border overflow-auto text-sm">
          {JSON.stringify(prds, null, 2)}
        </pre>
      </div>
    </div>
  );
} 