import { useState } from 'react'
import { Head } from '@inertiajs/react'
import Layout from '../components/Layout'
import GroupManager from '../components/GroupManager'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Checkbox } from '../components/ui/checkbox'

interface TestGroupsPageProps {
  campaignId: number
  groups: any[]
  variables: any[]
  user: any
}

export default function TestGroupsPage({ campaignId, groups, variables, user }: TestGroupsPageProps) {
  const [useAsyncMode, setUseAsyncMode] = useState(false)

  return (
    <>
      <Head title="Test Groups Async Loading" />
      <Layout user={user}>
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            {/* Header avec contrôles */}
            <Card>
              <CardHeader>
                <CardTitle>Test du chargement asynchrone des groupes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="async-mode"
                      checked={useAsyncMode}
                      onCheckedChange={(checked) => setUseAsyncMode(checked === true)}
                    />
                    <Label htmlFor="async-mode">
                      Mode asynchrone {useAsyncMode ? '✅' : '❌'}
                    </Label>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {useAsyncMode 
                      ? 'Chargement rapide des groupes, puis calcul des estimations en arrière-plan'
                      : 'Chargement synchrone classique (plus lent)'
                    }
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium">Fonctionnalités du mode async :</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Chargement immédiat des groupes sans estimations</li>
                    <li>• Calcul des estimations en arrière-plan avec indicateurs de loading</li>
                    <li>• Cache côté frontend et backend pour améliorer les performances</li>
                    <li>• Bouton de rechargement des estimations</li>
                    <li>• Interface responsive avec feedback visuel</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Composant GroupManager avec toggle du mode */}
            <GroupManager
              campaignId={campaignId}
              groups={groups}
              variables={variables}
              useAsyncLoading={useAsyncMode}
              onGroupUpdate={() => {
                console.log('Group updated - refresh page or implement live updates')
              }}
            />
          </div>
        </div>
      </Layout>
    </>
  )
}
