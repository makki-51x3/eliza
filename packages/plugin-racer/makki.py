import os

def write_tree_with_content(output_file, root_dir, ignore_list):
    with open(output_file, 'w') as file:
        # Write the directory tree outline
        file.write("Directory Tree Outline:\n")
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Filter out directories to ignore
            dirnames[:] = [d for d in dirnames if d not in ignore_list]
            level = dirpath.replace(root_dir, '').count(os.sep)
            indent = ' ' * 4 * level
            file.write(f"{indent}{os.path.basename(dirpath)}/\n")
            for filename in filenames:
                if filename not in ignore_list:
                    file.write(f"{' ' * 4 * (level + 1)}{filename}\n")

        # Write a separator between the outline and the detailed content
        file.write("\nDetailed File Content:\n")

        # Write the full directory tree with file content
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Filter out directories and files to ignore
            dirnames[:] = [d for d in dirnames if d not in ignore_list]
            filenames = [f for f in filenames if f not in ignore_list]

            # Write the current directory path
            level = dirpath.replace(root_dir, '').count(os.sep)
            indent = ' ' * 4 * level
            file.write(f"{indent}{os.path.basename(dirpath)}/\n")

            # Write each file name and its content
            for filename in filenames:
                file_path = os.path.join(dirpath, filename)
                file_indent = ' ' * 4 * (level + 1)
                file.write(f"{file_indent}{filename}\n")

                # Write the content of the file
                try:
                    with open(file_path, 'r') as f:
                        content = f.read().splitlines()
                    for line in content:
                        line_indent = ' ' * 4 * (level + 2)
                        file.write(f"{line_indent}{line}\n")
                except Exception as e:
                    # Handle cases where the file can't be read (e.g., binary files)
                    file.write(f"{file_indent}  (Could not read file: {e})\n")

# Specify the root directory, output file, and items to ignore
# root_directory = '/home/makki/Desktop/ELIZA_MULTIAGENT_FRAMEWORK/eliza/packages/plugin-racer/'
root_directory = '/home/makki/Desktop/ELIZA_MULTIAGENT_FRAMEWORK/eliza/packages/plugin-racer/src/actions'

output_text_file = 'makki_directory_tree.txt'
ignore_list = ['makki.py','makki_directory_tree.txt','node_modules','.turbo','dist','.npmignore']

# Run the function
write_tree_with_content(output_text_file, root_directory, ignore_list)