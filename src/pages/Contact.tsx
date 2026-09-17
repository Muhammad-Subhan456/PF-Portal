import { Mail, Phone, ExternalLink } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ContactCard = ({
    name,
    title,
    email,
    phone,
    isMain = false
}: {
    name: string;
    title: string;
    email: string;
    phone?: string;
    isMain?: boolean;
}) => (
    <Card className={`border-border ${isMain ? 'border-primary/20 shadow-md' : ''}`}>
        <CardHeader>
            <div className="flex items-start justify-between gap-4">
                <div>
                    <CardTitle className="text-lg font-bold">{name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{title}</p>
                </div>
                {isMain && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                        Instructor
                    </Badge>
                )}
            </div>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-3">
                <a
                    href={`mailto:${email}`}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                >
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-background flex items-center justify-center border border-border group-hover:border-primary/50 transition-colors">
                        <Mail className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium text-sm text-foreground truncate">{email}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                </a>

                {phone && (
                    <a
                        href={`https://wa.me/${phone.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
                    >
                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-background flex items-center justify-center border border-border group-hover:border-green-500/50 transition-colors">
                            <Phone className="h-5 w-5 text-muted-foreground group-hover:text-green-500 transition-colors" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground">WhatsApp</p>
                            <p className="font-medium text-sm text-foreground truncate">{phone}</p>
                        </div>
                        <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground/50 group-hover:text-foreground transition-colors" />
                    </a>
                )}
            </div>
        </CardContent>
    </Card>
);

const Contact = () => {
    return (
        <AppLayout>
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="animate-fade-in">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Contact Support</h1>
                    <p className="text-muted-foreground">Get in touch with your instructor and teaching assistants</p>
                </div>

                <div className="grid gap-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
                    {/* Main Instructor */}
                    <ContactCard
                        name="Dr. Zobia Sohail"
                        title="Course Instructor"
                        email="zobia.suhail@pucit.edu.pk"
                        isMain={true}
                    />

                    <div>
                        <h2 className="text-xl font-semibold mb-4">Teaching Assistants</h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <ContactCard
                                name="Hafiz Own"
                                title="Teaching Assistant"
                                email="bcsf23m018@pucit.edu.pk"
                                phone="+92 326 0706350"
                            />
                            <ContactCard
                                name="Hafiz Abdul Qadir"
                                title="Teaching Assistant"
                                email="bcsf23m002@pucit.edu.pk"
                                phone="+92 323 4892756"
                            />
                            <ContactCard
                                name="Asadullah Ahmad"
                                title="Teaching Assistant"
                                email="bcsf23m020@pucit.edu.pk"
                                phone="+92 334 6630398"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default Contact;
