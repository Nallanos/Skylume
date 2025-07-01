import { Head } from '@inertiajs/react'
import Layout from '../components/Layout'
import AddAccount from '../components/AddAccount'

interface AddAccountPageProps {
  user: any
}

function AddAccountPage({ user }: AddAccountPageProps) {
  return (
    <>
      <Head title="Add Account" />
      <Layout user={user}>
        <div className="p-6">
          <AddAccount />
        </div>
      </Layout>
    </>
  )
}

export default AddAccountPage
