import { useState, useEffect } from "react";
import { Search, Upload, Download, UserPlus, MoreHorizontal, Mail, X, Filter, Eye } from "lucide-react";
import AdminLayout from "@/components/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  getAllStudents,
  getStudentsBySection,
  uploadStudentsFromCSV,
  addStudent,
  removeStudent,
  exportStudentsToCSV,
  downloadCSV,
  type EnrolledStudent,
} from "@/lib/students";
import { preloadAllRanks } from "@/lib/rankingCache";
import StudentDetailDialog from "@/components/admin/StudentDetailDialog";

const AdminStudents = () => {
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<EnrolledStudent[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState<"all" | "CS-F26-M" | "CS-F26-A">("all");
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [newStudent, setNewStudent] = useState({
    rollNumber: "",
    name: "",
    section: "CS-F26-M" as "CS-F26-M" | "CS-F26-A",
    email: "",
  });
  const [selectedStudent, setSelectedStudent] = useState<EnrolledStudent | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const { toast } = useToast();

  // Fetch students
  const fetchStudents = async () => {
    try {
      setLoading(true);
      let data: EnrolledStudent[];
      
      if (sectionFilter === "all") {
        data = await getAllStudents();
      } else {
        data = await getStudentsBySection(sectionFilter);
      }
      
      setStudents(data);
      setFilteredStudents(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    // Pre-calculate and cache ranks for all sections in background
    // This makes the modal load instantly when clicked
    preloadAllRanks().catch(error => {
      console.error('Error preloading ranks:', error);
    });
  }, [sectionFilter]);

  // Filter students by search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents(students);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.roll_number.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query)
    );
    setFilteredStudents(filtered);
  }, [searchQuery, students]);

  // Handle CSV import
  const handleCSVImport = async () => {
    if (!csvFile) {
      toast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    try {
      const text = await csvFile.text();
      const result = await uploadStudentsFromCSV(text);
      
      if (result.success) {
        toast({
          title: "Success",
          description: `Successfully imported ${result.added} students`,
        });
        setIsImportDialogOpen(false);
        setCsvFile(null);
        fetchStudents();
      } else {
        toast({
          title: "Import completed with errors",
          description: result.errors.join(", "),
          variant: "destructive",
        });
        fetchStudents();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to import CSV",
        variant: "destructive",
      });
    }
  };

  // Handle add student
  const handleAddStudent = async () => {
    if (!newStudent.rollNumber || !newStudent.name) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const email = newStudent.email || `${newStudent.rollNumber.toLowerCase()}@pucit.edu.pk`;
      await addStudent({
        roll_number: newStudent.rollNumber.toLowerCase(),
        name: newStudent.name,
        section: newStudent.section,
        email: email.toLowerCase(),
      });
      
      toast({
        title: "Success",
        description: "Student added successfully",
      });
      setIsAddDialogOpen(false);
      setNewStudent({ rollNumber: "", name: "", section: "CS-F26-M", email: "" });
      fetchStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add student",
        variant: "destructive",
      });
    }
  };

  // Handle remove student
  const handleRemoveStudent = async (rollNumber: string, name: string) => {
    if (!confirm(`Are you sure you want to remove ${name} (${rollNumber})?`)) {
      return;
    }

    try {
      await removeStudent(rollNumber);
      toast({
        title: "Success",
        description: "Student removed successfully",
      });
      fetchStudents();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove student",
        variant: "destructive",
      });
    }
  };

  // Handle export
  const handleExport = () => {
    const csv = exportStudentsToCSV(students);
    downloadCSV(csv, `enrolled_students_${new Date().toISOString().split('T')[0]}.csv`);
    toast({
      title: "Success",
      description: "Students exported to CSV",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 animate-fade-in">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-1">Students</h1>
            <p className="text-muted-foreground">Manage enrolled students</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" className="rounded-xl gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="rounded-xl gap-2">
                  <Upload className="h-4 w-4" />
                  Import CSV
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Import Students from CSV</DialogTitle>
                  <DialogDescription>
                    Upload a CSV file with columns: Roll Number, Name, Section, Email
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="csv-file">CSV File</Label>
                    <Input
                      id="csv-file"
                      type="file"
                      accept=".csv"
                      onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">
                      Format: Roll Number, Name, Section (CS-F26-M/CS-F26-A), Email (optional)
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsImportDialogOpen(false)} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button onClick={handleCSVImport} className="rounded-xl bg-primary" disabled={!csvFile}>
                    Import
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-xl gap-2 bg-primary hover:bg-primary/90">
                  <UserPlus className="h-4 w-4" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                  <DialogDescription>
                    Add a student to the enrolled list
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="roll-number">Roll Number *</Label>
                    <Input
                      id="roll-number"
                      placeholder="bcsf23m001"
                      value={newStudent.rollNumber}
                      onChange={(e) => setNewStudent({ ...newStudent, rollNumber: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      placeholder="Student Name"
                      value={newStudent.name}
                      onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="section">Section *</Label>
                    <Select
                      value={newStudent.section}
                      onValueChange={(value: "CS-F26-M" | "CS-F26-A") => setNewStudent({ ...newStudent, section: value })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CS-F26-M">Section CS-F26-M</SelectItem>
                        <SelectItem value="CS-F26-A">Section CS-F26-A</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email (optional)</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="bcsf23m001@pucit.edu.pk"
                      value={newStudent.email}
                      onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                      className="rounded-xl"
                    />
                    <p className="text-xs text-muted-foreground">
                      If not provided, will be generated from roll number
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="rounded-xl">
                    Cancel
                  </Button>
                  <Button onClick={handleAddStudent} className="rounded-xl bg-primary">
                    Add Student
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex gap-4 animate-fade-in" style={{ animationDelay: "100ms" }}>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or roll number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 rounded-xl bg-muted/50 border-0"
            />
          </div>
          <Select value={sectionFilter} onValueChange={(value: "all" | "CS-F26-M" | "CS-F26-A") => setSectionFilter(value)}>
            <SelectTrigger className="w-[180px] rounded-xl">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by section" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              <SelectItem value="CS-F26-M">Section CS-F26-M</SelectItem>
              <SelectItem value="CS-F26-A">Section CS-F26-A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Students Table - Desktop */}
        <div 
          className="bg-card rounded-2xl border border-border overflow-hidden animate-fade-in hidden md:block"
          style={{ animationDelay: "200ms" }}
        >
          {loading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading students...</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <Table className="min-w-full">
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold min-w-[120px]">Roll Number</TableHead>
                    <TableHead className="font-semibold min-w-[150px]">Name</TableHead>
                    <TableHead className="font-semibold min-w-[200px]">Email</TableHead>
                    <TableHead className="font-semibold min-w-[120px]">Section</TableHead>
                    <TableHead className="font-semibold w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow 
                      key={student.id} 
                      className="hover:bg-muted/30 cursor-pointer"
                      onClick={() => {
                        setSelectedStudent(student);
                        setIsDetailDialogOpen(true);
                      }}
                    >
                      <TableCell className="font-mono text-sm whitespace-nowrap">{student.roll_number}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{student.name}</TableCell>
                      <TableCell className="text-muted-foreground whitespace-nowrap">
                        {student.email}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-foreground">
                          {student.section}
                        </span>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="rounded-lg">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="rounded-xl">
                            <DropdownMenuItem 
                              className="rounded-lg"
                              onClick={() => {
                                setSelectedStudent(student);
                                setIsDetailDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem className="rounded-lg">
                              <Mail className="h-4 w-4 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              className="rounded-lg text-destructive"
                              onClick={() => handleRemoveStudent(student.roll_number, student.name)}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Remove Student
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && filteredStudents.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <p>No students found matching your search.</p>
            </div>
          )}
        </div>

        {/* Students Cards - Mobile */}
        <div 
          className="space-y-4 animate-fade-in md:hidden"
          style={{ animationDelay: "200ms" }}
        >
          {loading ? (
            <div className="text-center py-12">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading students...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No students found matching your search.</p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div 
                key={student.id} 
                className="bg-card rounded-2xl border border-border p-4 cursor-pointer hover:shadow-soft transition-all"
                onClick={() => {
                  setSelectedStudent(student);
                  setIsDetailDialogOpen(true);
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-mono text-sm font-semibold text-foreground">{student.roll_number}</p>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/20 text-foreground">
                        {student.section}
                      </span>
                    </div>
                    <p className="font-medium text-foreground mb-1">{student.name}</p>
                    <p className="text-sm text-muted-foreground truncate">{student.email}</p>
                  </div>
                  <div onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-lg flex-shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="rounded-xl">
                        <DropdownMenuItem 
                          className="rounded-lg"
                          onClick={() => {
                            setSelectedStudent(student);
                            setIsDetailDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="rounded-lg">
                          <Mail className="h-4 w-4 mr-2" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="rounded-lg text-destructive"
                          onClick={() => handleRemoveStudent(student.roll_number, student.name)}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Remove Student
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        {!loading && (
          <div className="flex items-center justify-between text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: "300ms" }}>
            <p>Showing {filteredStudents.length} of {students.length} students</p>
            <div className="flex gap-4">
              <p>Section CS-F26-M: {students.filter(s => s.section === 'CS-F26-M').length}</p>
              <p>Section CS-F26-A: {students.filter(s => s.section === 'CS-F26-A').length}</p>
            </div>
          </div>
        )}

        {/* Student Detail Dialog */}
        <StudentDetailDialog
          student={selectedStudent}
          open={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
        />
      </div>
    </AdminLayout>
  );
};

export default AdminStudents;
