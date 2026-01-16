import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Help = () => {
  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-foreground">Help</h1>
          <p className="text-muted-foreground">Quick answers and guidance.</p>
        </header>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>FAQ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">How do I sign in?</p>
              <p>Use the “Sign In” button on the top right, then create an account or log in.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">Why can’t I comment?</p>
              <p>You must be signed in to comment, like, or subscribe.</p>
            </div>
            <div>
              <p className="font-medium text-foreground">How do I upload?</p>
              <p>Go to the Upload page from the top bar or sidebar.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Help;
