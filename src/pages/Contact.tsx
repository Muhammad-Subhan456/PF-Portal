import { Mail, Phone, ExternalLink } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
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

const teachingAssistants = [
    { name: "Ibraheem Qureshi", roll: "bcsf23m05", phone: "+92 305 4633021" },
    { name: "Muhammad Subhan", roll: "bcsf23m025", phone: "+92 313 4713370" },
    { name: "Huda Liaquat", roll: "bcsf23m006", phone: "+92 312 7090193" },
    { name: "Laibah Rashid", roll: "bitf23m036", phone: "+92 322 0242234" },
    { name: "Mauzam Ali", roll: "bcsf23m047", phone: "+92 312 4883528" },
    { name: "Muhammad Zohaib", roll: "bcsf23m027", phone: "+92 320 4036559" },
    { name: "Maaz Bin Asif", roll: "bcsf24m007", phone: "+92 312 1442598" },
    { name: "Muhammad Ali", roll: "bcsf24a024", phone: "+92 335 3378356" },
];

const Contact = () => {
    return (
        <AppLayout>
            <div className="space-y-6 max-w-4xl mx-auto">
                <div className="animate-fade-in">
                    <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Contact Support</h1>
                    <p className="text-muted-foreground">Get in touch with your instructor and teaching assistants</p>
                </div>

                <div className="grid gap-6 animate-fade-in" style={{ animationDelay: "100ms" }}>
                    <ContactCard
                        name="Sir Abdul Mateen"
                        title="Course Instructor"
                        email="amateen@pucit.edu.pk"
                        isMain={true}
                    />

                    <div>
                        <h2 className="text-xl font-semibold mb-4">Teaching Assistants</h2>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {teachingAssistants.map((ta) => (
                                <ContactCard
                                    key={ta.roll}
                                    name={ta.name}
                                    title="Teaching Assistant"
                                    email={`${ta.roll}@pucit.edu.pk`}
                                    phone={ta.phone}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
};

export default Contact;
