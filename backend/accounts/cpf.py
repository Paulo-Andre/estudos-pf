def normalize_cpf(value):
    return "".join(ch for ch in str(value or "") if ch.isdigit())

def is_valid_cpf(value):
    cpf=normalize_cpf(value)
    if len(cpf)!=11 or cpf==cpf[0]*11:
        return False
    nums=[int(x) for x in cpf]
    first=sum(nums[i]*(10-i) for i in range(9))
    d1=(first*10)%11
    d1=0 if d1==10 else d1
    second=sum(nums[i]*(11-i) for i in range(10))
    d2=(second*10)%11
    d2=0 if d2==10 else d2
    return nums[9]==d1 and nums[10]==d2
