import DashboardLayout from "../../components/DashboardLayout";
import DEPARTMENTS from "../../data/departments";

export default function ManageDepartments() {
    return (
        <DashboardLayout title="Department Ontology" subtitle="Mapping of Civic Intents to Responsible Agencies">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeInUp">
                {DEPARTMENTS.map(dept => (
                    <div key={dept.id} className="card hover:border-[var(--color-primary-light)] transition-colors">
                        <div className="flex items-center gap-3 mb-4 border-b border-[var(--color-border)] pb-4">
                            <div className="text-3xl">{dept.icon}</div>
                            <h2 className="font-bold text-lg leading-tight">{dept.name}</h2>
                        </div>
                        <p className="text-sm text-[var(--color-text-muted)] mb-4">{dept.description}</p>

                        <div>
                            <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Maps to AI Intents</h3>
                            <div className="flex flex-wrap gap-2">
                                {dept.categories.map(cat => (
                                    <span key={cat} className="badge bg-[var(--color-primary)]/10 text-[var(--color-primary-light)] border border-[var(--color-primary)]/20 text-xs">
                                        {cat.replace(/_/g, " ")}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </DashboardLayout>
    );
}
