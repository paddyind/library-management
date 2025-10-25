import { useState } from 'react';
import Layout from '../components/layout/Layout';
import MemberList from '../components/members/MemberList';
import MemberForm from '../components/members/MemberForm';

export default function MembersPage() {
  const [isAddingMember, setIsAddingMember] = useState(false);

  const handleAddMember = (memberData) => {
    // TODO: Implement member addition logic
    console.log('Adding member:', memberData);
    setIsAddingMember(false);
  };

  return (
    <Layout>
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isAddingMember ? (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">Add New Member</h1>
                <button
                  onClick={() => setIsAddingMember(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                >
                  Cancel
                </button>
              </div>
              <MemberForm onSubmit={handleAddMember} />
            </div>
          ) : (
            <MemberList onAddClick={() => setIsAddingMember(true)} />
          )}
        </div>
      </div>
    </Layout>
  );
}
